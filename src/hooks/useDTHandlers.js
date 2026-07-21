import { supaFetch } from "../supabase.js";
import { saveJSON, loadJSON } from "../utils.js";
import { validarRegistroOperacional } from "../validators.js";

const SUPA_KNOWN_COLS = [
  "dt","nome","cpf","placa","placa2","placa3","vinculo","origem","destino",
  "data_carr","data_agenda","status","dias",
  "vl_cte","vl_contrato","adiant","saldo","diaria_prev","diaria_pg","vl_cte_comp",
  "cte","mdf","nf","mat","ro","ro_hora","ro_status","cliente","sgs",
  "chegada","obs_chegada","data_obs_chegada","desc_aguardando","data_desc","obs_descarga","data_obs_descarga","informou_analista","data_manifesto","gerenc","forms","updated_at",
  "data_criacao","minutas_dcc","cte_comp","mdf_comp","mat_comp",
  "obs","sinistro","ocorrencias",
  // ── Campos exclusivos AVB (acailandia_avb) ──
  "codigo","data_homerico","data_liberacao","gerenciadora",
  "rdo","contrato_mat","cadastro_fortes","cte_comp_num","cte_comp_vlr",
  "contratante"
];

export function useDTHandlers({
  getConexao, showToast, sessionToken, setSessionToken, baseAtual, registrarLog,
  DADOS, formData, editIdx, dadosBase, dadosExtras,
  setDadosBase, setDadosExtras, setModalOpen,
  setDetalheDT, setExcluirConfirm, setExcluirTexto,
  detalheDT, detalheMinDcc, detalheCteComp, detalheMinDsc,
  setSalvandoMins,
}) {
  // sessionToken vive só em memória (nunca em localStorage) — some ao recarregar a página.
  // App.jsx tenta regenerá-lo no boot via co_sessao.email, mas aquela chamada é
  // fire-and-forget (.catch(() => {})): se falhar (rede, RPC fora do ar, corrida com
  // getConexao ainda não pronto), o token fica null pra sempre e toda gravação passa a
  // cair em "Salvo local" sem nunca sincronizar, sem qualquer sinal de erro visível até
  // a pessoa tentar editar algo. Aqui, antes de desistir, tenta regenerar UMA vez usando
  // o e-mail já salvo na sessão — evita depender de logout/login pra voltar a funcionar.
  const garantirSessionToken = async (conn) => {
    if (sessionToken) return sessionToken;
    const s = loadJSON("co_sessao", null);
    const email = s?.email || (s?.perfil === "admin" ? "admin@sistema" : null);
    if (!email) return null;
    try {
      const tok = await supaFetch(conn.url, conn.key, "POST", "rpc/gerar_token_sessao", { p_email: email });
      if (typeof tok === "string" && tok) { setSessionToken?.(tok); return tok; }
    } catch { /* segue pro erro padrão abaixo */ }
    return null;
  };

  const supaUpsert = async (reg) => {
    // Guarda: linhas SEM DT (injetadas no DADOS a partir da fila 'Cargas sem DT', dt sintético
    // "SEMDT-...") NÃO vão pra tabela principal — editar/decidir é na fila, não na Planilha.
    if (reg?._semDt || String(reg?.dt || "").startsWith("SEMDT-")) {
      throw new Error('Carga sem DT — edite ou decida na fila "Cargas sem DT", não na Planilha.');
    }
    const conn = getConexao();
    if (!conn) throw new Error("Sem conexão");
    const tok = await garantirSessionToken(conn);
    if (!tok) throw new Error("Sessão não autenticada — saia e entre novamente para continuar sincronizando.");
    const clean = {...reg}; delete clean._override; delete clean._overrideDT; delete clean._semDt;
    for (const k of Object.keys(clean)) { if (clean[k] === "") clean[k] = null; }
    // AVB: âncora = codigo (coluna H); grava via upsert por codigo. Sem dt obrigatório.
    if (baseAtual?.id === "acailandia_avb") {
      await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_operacional_cod", {
        p_token: tok,
        p_base:  baseAtual.id,
        p_dados: clean,
      });
      return;
    }
    if (!clean.dt) throw new Error("DT obrigatório");
    const { ok: validOk, erros: validErros } = validarRegistroOperacional(clean);
    if (!validOk) throw new Error("Dados inválidos: " + validErros.join("; "));
    // M2/M3: escrita via RPC que valida token + base no servidor
    await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_operacional", {
      p_token: tok,
      p_base:  baseAtual?.id ?? "imperatriz_belem",
      p_dados: clean,
    });
  };

  // Save record
  const salvarRegistro = async () => {
    const reg = {...formData};

    // ── AVB: âncora = codigo. Sem código pode subir como avulso, com alerta. ──
    if (baseAtual?.id === "acailandia_avb") {
      if (!reg.codigo) {
        const ok = window.confirm("\u26a0\ufe0f Este registro nao tem CODIGO (coluna H).\n\nSalvar assim mesmo como CARREGAMENTO AVULSO?\n(Recomendado definir um codigo para evitar duplicidade.)");
        if (!ok) return;
      }
      if (editIdx >= 0 && reg.codigo) {
        setDadosBase(prev => prev.map(r => r.codigo === reg.codigo ? {...r, ...reg} : r));
      } else {
        if (!reg.data_criacao) reg.data_criacao = new Date().toISOString();
        setDadosBase(prev => [...prev, reg]);
      }
      const connAvb = getConexao();
      if (connAvb) {
        try {
          await supaUpsert(reg);
          await registrarLog(editIdx>=0 ? "EDITAR_REGISTRO" : "NOVO_REGISTRO", `COD ${reg.codigo||"(avulso)"} — ${reg.nome||"sem nome"}`, editIdx>=0 ? DADOS[editIdx] : null, reg);
          showToast("✅ Salvo e sincronizado!","ok");
        } catch(e) { showToast("⚠️ Salvo local. Sync: "+e.message,"warn"); }
      } else { showToast("✅ Salvo localmente!","ok"); }
      setModalOpen(null);
      return;
    }

    if (!reg.dt) { showToast("⚠️ DT obrigatório","warn"); return; }

    // local save
    const newExtras = [...dadosExtras];
    if (editIdx >= 0) {
      if (editIdx < dadosBase.length) {
        reg._override = true;
        reg._overrideDT = dadosBase[editIdx].dt;
        const filtered = newExtras.filter(x => x._overrideDT !== reg._overrideDT);
        filtered.push(reg);
        setDadosExtras(filtered);
        saveJSON("dados_extras", filtered.map(({cpf:_c1,...r})=>r));
      } else {
        newExtras[editIdx - dadosBase.length] = reg;
        setDadosExtras(newExtras);
        saveJSON("dados_extras", newExtras.map(({cpf:_c2,...r})=>r));
      }
    } else {
      // Novo registro: registra data/hora de criação
      if (!reg.data_criacao) reg.data_criacao = new Date().toISOString();
      newExtras.push(reg);
      setDadosExtras(newExtras);
      saveJSON("dados_extras", newExtras.map(({cpf:_c3,...r})=>r));
    }

    // Supabase sync
    const conn = getConexao();
    if (conn) {
      try {
        await supaUpsert(reg);
        await registrarLog(
          editIdx>=0 ? "EDITAR_REGISTRO" : "NOVO_REGISTRO",
          `DT ${reg.dt} — ${reg.nome||"sem nome"}`,
          editIdx>=0 ? DADOS[editIdx] : null,
          reg
        );
        showToast("✅ Salvo e sincronizado!","ok");
      }
      catch(e) { showToast("⚠️ Salvo local. Sync: "+e.message,"warn"); }
    } else {
      showToast("✅ Salvo localmente!","ok");
    }
    setModalOpen(null);
  };

  // Delete record
  const deletarRegistro = async (dt) => {
    const newExtras = dadosExtras.filter(x => x._overrideDT !== dt && x.dt !== dt);
    setDadosExtras(newExtras);
    saveJSON("dados_extras", newExtras.map(({cpf:_c4,...r})=>r));
    setDadosBase(prev => prev.filter(r => r.dt !== dt));
    const conn = getConexao();
    if (conn) {
      try {
        const tok = await garantirSessionToken(conn);
        if (!tok) throw new Error("Sessão não autenticada — saia e entre novamente para continuar sincronizando.");
        // M2/M3: deleção via RPC que valida token + base no servidor
        await supaFetch(conn.url, conn.key, "POST", "rpc/delete_operacional", {
          p_token: tok,
          p_base:  baseAtual?.id ?? "imperatriz_belem",
          p_dt:    dt,
        });
        await registrarLog("EXCLUIR_REGISTRO", `DT ${dt} excluido`);
        showToast("🗑️ Registro excluído!", "ok");
      } catch(e) { showToast("⚠️ Excluído local. Sync: "+e.message, "warn"); }
    } else { showToast("🗑️ Registro excluído localmente!", "ok"); }
    setModalOpen(null); setDetalheDT(null);
    setExcluirConfirm(null); setExcluirTexto("");
  };

  // Salva minutas DCC / MAM-MRM no Supabase via PATCH
  const salvarMinutasDetalhe = async () => {
    if (!detalheDT) return;
    const conn = getConexao();
    if (!conn) { showToast("⚠️ Sem conexão","warn"); return; }
    setSalvandoMins(true);
    try {
      const tok = await garantirSessionToken(conn);
      if (!tok) throw new Error("Sessão não autenticada — saia e entre novamente para continuar sincronizando.");
      const payload = {
        minutas_dcc: JSON.stringify(detalheMinDcc),
        cte_comp:  detalheCteComp.cte||null,
        mdf_comp:  detalheCteComp.mdf||null,
        mat_comp:  detalheCteComp.mat||null,
        minutas_dsc: JSON.stringify(detalheMinDsc),
      };
      // M2/M3: patch via RPC que valida token + base no servidor
      await supaFetch(conn.url, conn.key, "POST", "rpc/patch_operacional", {
        p_token: tok,
        p_base:  baseAtual?.id ?? "imperatriz_belem",
        p_dt:    detalheDT.dt,
        p_dados: payload,
      });
      const updated = {...detalheDT, ...payload};
      setDetalheDT(updated);
      setDadosBase(prev => prev.map(r => r.dt === detalheDT.dt ? {...r, ...payload} : r));
      showToast("✅ Documentos salvos!","ok");
    } catch(e) {
      showToast("⚠️ Erro: "+e.message,"warn");
    } finally {
      setSalvandoMins(false);
    }
  };

  return { supaUpsert, salvarRegistro, deletarRegistro, salvarMinutasDetalhe };
}
