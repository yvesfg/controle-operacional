import React from "react";
import Icon from "../../components/Icon.jsx";
import useVeiculos from "../../hooks/useVeiculos.js";
import useMotoristas from "../../hooks/useMotoristas.js";
import EmptyState from "../../components/EmptyState.jsx";
import { soDigitosPlaca } from "../../veiculos.js";
import { normalizarRenavam, renavamSuspeito, cpfCnpjValido, formatarCpfCnpj } from "../../cadastroEmbarcadora.js";

// Veículos — cavalos e carretas, vinculados a um motorista via motorista_id.
// config_eixos/carroceria/capacidade_m3 só fazem sentido pra tipo=carreta
// (ver migration 008); ficam desabilitados no form quando tipo=cavalo.
//
// Os campos de DOCUMENTO (marca, modelo, cor, ano, RENAVAM, chassi, tanque,
// CPF/CNPJ do responsável — migration 070) existem porque a embarcadora os
// exige. Dá pra chegar neles pela ficha do motorista também; aqui é o caminho
// de quem está mexendo no veículo, não na pessoa.

const VAZIO = { placa: "", tipo: "cavalo", num_eixos: "", config_eixos: "", carroceria: "", capacidade_m3: "", motorista_id: "", ativo: true,
  marca: "", modelo: "", cor: "", ano: "", renavam: "", chassi: "", especie: "", tanque_litros: "", cpf_cnpj_responsavel: "" };

// Categoria = SOMA dos eixos do cavalo + da(s) carreta(s) do mesmo motorista.
// (cavalo 2 + carreta 3 = 5 -> SIMPLES; 3+3 = 6 -> LS; 3+4 = 7 -> LS4EIXO;
//  BITREM = 7 com duas carretas; RODOTREM = 9.)
const categoriaPorEixos = (total, qtdCarretas) => {
  if (!total) return null;
  if (total >= 9) return "RODOTREM (9 eixos)";
  if (total === 7) return qtdCarretas >= 2 ? "BITREM (7 eixos, 2 carretas)" : "LS4EIXO (7 eixos)";
  if (total === 6) return "LS (6 eixos)";
  if (total === 5) return "SIMPLES (5 eixos)";
  return `${total} eixos`;
};

export default function VeiculosCad({ ctx, conn }) {
  const { t, showToast, hexRgb, openDocIntake } = ctx;
  const onErro = React.useCallback((msg) => showToast?.(msg, "erro"), [showToast]);
  const { lista, loading, criar, atualizar } = useVeiculos(conn, { onErro });
  const { motoristas } = useMotoristas(conn, { onErro });
  const motoristaPorId = React.useMemo(() => new Map(motoristas.map((m) => [m.id, m])), [motoristas]);

  const [busca, setBusca] = React.useState("");
  const [form, setForm] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toUpperCase();
    if (!q) return lista;
    return lista.filter((v) =>
      v.placa.includes(q.replace(/[^A-Z0-9]/g, "")) ||
      (motoristaPorId.get(v.motorista_id)?.nome || "").toUpperCase().includes(q)
    );
  }, [lista, busca, motoristaPorId]);

  const editar = (v) => setForm({ ...VAZIO, ...v, motorista_id: v.motorista_id || "" });
  const novo = () => setForm({ ...VAZIO, __novo: true });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Peças do motorista selecionado no form + a que está sendo editada agora (com os
  // valores ainda não salvos), pra somar os eixos do conjunto em tempo real.
  const conjunto = React.useMemo(() => {
    if (!form?.motorista_id) return null;
    const motorista = motoristaPorId.get(form.motorista_id);
    if (!motorista) return null;
    const placaAtual = soDigitosPlaca(form.placa);
    const outras = lista.filter((v) => v.motorista_id === form.motorista_id && v.placa !== placaAtual);
    const emEdicao = placaAtual
      ? [{ placa: placaAtual, tipo: form.tipo, num_eixos: form.num_eixos ? parseInt(form.num_eixos, 10) : null }]
      : [];
    const pecas = [...emEdicao, ...outras].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "cavalo" ? -1 : 1));
    const total = pecas.reduce((s, p) => s + (Number(p.num_eixos) || 0), 0);
    return { motorista, pecas, total, qtdCarretas: pecas.filter((p) => p.tipo === "carreta").length };
  }, [form?.motorista_id, form?.placa, form?.tipo, form?.num_eixos, lista, motoristaPorId]);

  // Preenche o form com o que a IA leu do CRLV — nada é gravado antes de o
  // usuário revisar e salvar. Em veículo JÁ cadastrado a placa não muda (é a
  // chave); o documento serve pra completar o resto.
  const aplicarCrlv = (d) => {
    setForm((f) => ({
      ...f,
      placa: f.__novo && d.placa ? d.placa : f.placa,
      marca: d.marca || f.marca,
      modelo: d.modelo || f.modelo,
      cor: d.cor || f.cor,
      ano: d.ano || f.ano,
      renavam: d.renavam ? normalizarRenavam(d.renavam) : f.renavam,
      chassi: d.chassi || f.chassi,
      especie: d.especie || f.especie,
      cpf_cnpj_responsavel: d.cpf_cnpj || f.cpf_cnpj_responsavel,
      // A espécie do CRLV diz o que é a peça: "CAMINHAO TRATOR" é cavalo,
      // "SEMI-REBOQUE"/"REBOQUE" é carreta. Só ajusta em cadastro novo, pra não
      // reclassificar um veículo que já está vinculado a um conjunto.
      tipo: f.__novo && d.especie ? (/REBOQUE/i.test(d.especie) ? "carreta" : "cavalo") : f.tipo,
    }));
    showToast?.(`CRLV lido${d.placa ? ` — ${d.placa}` : ""}. Confira antes de salvar.`, "ok");
  };

  const salvar = async () => {
    const placa = soDigitosPlaca(form.placa);
    if (!placa) { showToast?.("Informe a placa.", "erro"); return; }
    const dados = {
      tipo: form.tipo,
      // num_eixos vale pros DOIS tipos (cavalo 2-3, carreta 3-4) — migration 014.
      num_eixos: form.num_eixos ? parseInt(form.num_eixos, 10) : null,
      // Já carroceria/capacidade/rótulo do conjunto só fazem sentido na carreta.
      config_eixos: form.tipo === "carreta" ? (form.config_eixos || null) : null,
      carroceria: form.tipo === "carreta" ? (form.carroceria || null) : null,
      capacidade_m3: form.tipo === "carreta" && form.capacidade_m3 ? parseFloat(form.capacidade_m3) : null,
      motorista_id: form.motorista_id || null,
      ativo: !!form.ativo,
      // Documento (migration 070). Campo vazio vira null, não "": a RPC já
      // converte, e o RENAVAM tem índice único onde "" repetido colidiria.
      marca: form.marca || null,
      modelo: form.modelo || null,
      cor: form.cor || null,
      ano: form.ano ? parseInt(form.ano, 10) : null,
      renavam: form.renavam ? normalizarRenavam(form.renavam) : null,
      chassi: form.chassi || null,
      especie: form.especie || null,
      // Tanque só no cavalo — na carreta não há o que informar.
      tanque_litros: form.tipo === "cavalo" && form.tanque_litros ? parseInt(form.tanque_litros, 10) : null,
      cpf_cnpj_responsavel: form.cpf_cnpj_responsavel || null,
    };
    setSalvando(true);
    try {
      if (form.__novo) await criar({ ...dados, placa });
      else await atualizar(placa, dados);
      showToast?.(`Veículo ${placa} ${form.__novo ? "cadastrado" : "atualizado"}.`, "ok");
      setForm(null);
    } catch (e) {
      const dup = /duplicate key|23505/i.test(e.message);
      showToast?.(dup ? "Essa placa já está cadastrada." : "Erro ao salvar: " + e.message, "erro");
    } finally { setSalvando(false); }
  };

  const inp = { fontSize: 12.5, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", width: "100%" };
  const lbl = { fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por placa ou motorista"
          style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
        <button onClick={novo}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none" }}>
          + Novo veículo
        </button>
      </div>

      {form && (
        <div style={{ marginBottom: 14, border: `1.5px solid ${t.ouro}`, borderRadius: 10, background: t.card, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>{form.__novo ? "Novo veículo" : `Editando: ${form.placa}`}</div>

          {openDocIntake && (
            <button onClick={() => openDocIntake("crlv", aplicarCrlv)}
              title="Envie foto ou PDF do CRLV — preenche placa, marca, modelo, cor, ano, RENAVAM e chassi"
              style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.azul, border: `1.5px solid ${t.azul}` }}>
              <Icon n="file-text" s={13} /> Ler CRLV (foto ou PDF)
            </button>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Placa</label>
              <input value={form.placa} disabled={!form.__novo} onChange={(e) => set("placa", e.target.value.toUpperCase())} style={{ ...inp, opacity: form.__novo ? 1 : .6 }} />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Tipo</label>
              <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inp}>
                <option value="cavalo">Cavalo</option>
                <option value="carreta">Carreta</option>
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={lbl}>Motorista vinculado</label>
              <select value={form.motorista_id} onChange={(e) => set("motorista_id", e.target.value)} style={inp}>
                <option value="">Sem vínculo</option>
                {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Eixos DESTA peça — vale pros dois tipos (cavalo 2-3, carreta 3-4). */}
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Eixos {form.tipo === "cavalo" ? "do cavalo" : "da carreta"}</label>
              <select value={form.num_eixos ?? ""} onChange={(e) => set("num_eixos", e.target.value)} style={inp}>
                <option value="">—</option>
                {(form.tipo === "cavalo" ? [2, 3] : [2, 3, 4]).map((n) => (
                  <option key={n} value={n}>{n} eixos</option>
                ))}
              </select>
            </div>
            {/* Rótulo do CONJUNTO (soma cavalo+carreta) — só na carreta, que é onde
                a agenda/TMS registra. O total real aparece embaixo pra conferência. */}
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Categoria do conjunto</label>
              <select value={form.config_eixos || ""} disabled={form.tipo !== "carreta"} onChange={(e) => set("config_eixos", e.target.value)} style={{ ...inp, opacity: form.tipo !== "carreta" ? .5 : 1 }}>
                <option value="">—</option>
                <option value="SIMPLES">Simples (5 eixos)</option>
                <option value="LS">LS (6 eixos)</option>
                <option value="LS4EIXO">LS4EIXO (7 eixos)</option>
                <option value="BITREM">Bitrem (7 eixos)</option>
                <option value="RODOTREM">Rodotrem (9 eixos)</option>
              </select>
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Carroceria</label>
              <select value={form.carroceria || ""} disabled={form.tipo !== "carreta"} onChange={(e) => set("carroceria", e.target.value)} style={{ ...inp, opacity: form.tipo !== "carreta" ? .5 : 1 }}>
                <option value="">—</option>
                <option value="GA">Grade Alta</option>
                <option value="GB">Grade Baixa</option>
                <option value="GRA">Graneleira</option>
                <option value="SIDER">Sider</option>
                <option value="BAU">Baú</option>
              </select>
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Capacidade (m³)</label>
              <input value={form.capacidade_m3 || ""} disabled={form.tipo !== "carreta"} onChange={(e) => set("capacidade_m3", e.target.value)} style={{ ...inp, opacity: form.tipo !== "carreta" ? .5 : 1 }} />
            </div>
          </div>

          {/* ── Documento (CRLV) — é o que a embarcadora exige no cadastro ── */}
          <div style={{ fontSize: 10.5, color: t.txt2, margin: "12px 0 4px" }}>Documento do veículo</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["marca", "Marca", "1 1 120px"], ["modelo", "Modelo", "1 1 150px"], ["cor", "Cor", "1 1 100px"],
              ["ano", "Ano", "0 0 90px"]].map(([k, label, flex]) => (
              <div key={k} style={{ flex }}>
                <label style={lbl}>{label}</label>
                <input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value.toUpperCase())} style={inp} />
              </div>
            ))}
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>RENAVAM</label>
              <input value={form.renavam ?? ""} placeholder="11 dígitos"
                onChange={(e) => set("renavam", e.target.value.replace(/\D/g, ""))}
                onBlur={(e) => set("renavam", normalizarRenavam(e.target.value))}
                style={{ ...inp, borderColor: renavamSuspeito(form.renavam) ? t.warn : t.borda }} />
            </div>
            {/* Tanque só no cavalo: não vem no CRLV, é digitado uma vez e fica. */}
            <div style={{ flex: "0 0 120px" }}>
              <label style={lbl}>Tanque (L)</label>
              <input value={form.tanque_litros ?? ""} placeholder="540" disabled={form.tipo !== "cavalo"}
                onChange={(e) => set("tanque_litros", e.target.value.replace(/\D/g, ""))}
                style={{ ...inp, opacity: form.tipo !== "cavalo" ? .5 : 1 }} />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={lbl}>Chassi</label>
              <input value={form.chassi ?? ""} onChange={(e) => set("chassi", e.target.value.toUpperCase())} style={inp} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Espécie (CRLV)</label>
              <input value={form.especie ?? ""} placeholder="CAMINHAO TRATOR" onChange={(e) => set("especie", e.target.value.toUpperCase())} style={inp} />
            </div>
            <div style={{ flex: "1 1 170px" }}>
              <label style={lbl}>CPF/CNPJ do responsável</label>
              <input value={form.cpf_cnpj_responsavel ?? ""} placeholder="CPF ou CNPJ"
                onChange={(e) => set("cpf_cnpj_responsavel", e.target.value)}
                onBlur={(e) => cpfCnpjValido(e.target.value) && set("cpf_cnpj_responsavel", formatarCpfCnpj(e.target.value))}
                style={{ ...inp, borderColor: form.cpf_cnpj_responsavel && !cpfCnpjValido(form.cpf_cnpj_responsavel) ? t.warn : t.borda }} />
              {form.cpf_cnpj_responsavel && !cpfCnpjValido(form.cpf_cnpj_responsavel) && (
                <div style={{ fontSize: 10, color: t.warn, marginTop: 2 }}>Não é um CPF nem um CNPJ válido</div>
              )}
            </div>
          </div>

          {/* Conjunto do motorista escolhido: mostra as outras peças dele e a SOMA
              dos eixos (é o que define SIMPLES/LS/LS4EIXO). Sem isso não dava pra
              saber, ao vincular, o que o motorista já tem atrelado. */}
          {conjunto && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: t.card2, border: `1px solid ${t.borda}` }}>
              <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 5 }}>Conjunto de {conjunto.motorista.nome}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {conjunto.pecas.map((p) => (
                  <span key={p.placa} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, fontFamily: "var(--font-mono)",
                    background: p.placa === soDigitosPlaca(form.placa) ? hexRgb(t.ouro, .16) : "transparent",
                    border: `1px solid ${p.placa === soDigitosPlaca(form.placa) ? t.ouro : t.borda}`, color: t.txt }}>
                    {p.placa} · {p.tipo}{p.num_eixos ? ` · ${p.num_eixos}e` : ""}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: conjunto.total ? t.txt : t.txt2, marginTop: 6 }}>
                {conjunto.total
                  ? <>Total: <b>{conjunto.total} eixos</b> <Icon n="arrow-right" s={13} /> {categoriaPorEixos(conjunto.total, conjunto.qtdCarretas)}</>
                  : "Preencha os eixos das peças pra calcular a categoria."}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={() => setForm(null)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: salvando ? .5 : 1 }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: t.txt2, padding: 8 }}>Carregando…</div>}
      {!loading && filtrados.length === 0 && <EmptyState title="Nenhum veículo" description={busca ? "Nada bate com essa busca." : "Cadastre o primeiro veículo."} />}

      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>{filtrados.length} de {lista.length} veículo(s)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
        {filtrados.slice(0, 200).map((v) => (
          <div key={v.placa} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", borderRadius: 10, background: t.card, border: `1px solid ${t.borda}`, opacity: v.ativo ? 1 : .55 }}>
            <div style={{ flex: "0 0 100px", fontSize: 13, fontWeight: 700, color: t.txt, fontFamily: "var(--font-mono)" }}>{v.placa}</div>
            <div style={{ flex: "0 0 80px", fontSize: 11, color: t.txt2, textTransform: "capitalize" }}>{v.tipo}</div>
            <div style={{ flex: "1 1 180px", fontSize: 11.5, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {motoristaPorId.get(v.motorista_id)?.nome || <span style={{ color: t.txt2 }}>sem vínculo</span>}
            </div>
            <div style={{ flex: "1 1 160px", fontSize: 10.5, color: t.txt2 }}>
              {[[v.marca, v.modelo].filter(Boolean).join(" "), v.num_eixos && `${v.num_eixos} eixos`, v.config_eixos, v.carroceria, v.capacidade_m3 && v.capacidade_m3 + "m³"].filter(Boolean).join(" · ")}
              {!v.renavam && <span style={{ color: t.warn }}> · sem RENAVAM</span>}
            </div>
            <button onClick={() => editar(v)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt, border: `1px solid ${t.borda}` }}>Editar</button>
          </div>
        ))}
        {filtrados.length > 200 && <div style={{ fontSize: 11, color: t.txt2, textAlign: "center", padding: 8 }}>mostrando 200 de {filtrados.length} — refine a busca pra ver os demais</div>}
      </div>
    </div>
  );
}
