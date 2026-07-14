import React from "react";
import PageHeader from "../components/PageHeader.jsx";
import EmbarcadorasCad from "./cadastros/EmbarcadorasCad.jsx";
import MotoristasCad from "./cadastros/MotoristasCad.jsx";
import VeiculosCad from "./cadastros/VeiculosCad.jsx";

// Cadastros — casa dos cadastros GLOBAIS do app (dados que várias telas consomem,
// não dados de um módulo só).

const SECOES = [
  { k: "embarcadoras", l: "Embarcadoras", Comp: EmbarcadorasCad },
  { k: "motoristas", l: "Motoristas", Comp: MotoristasCad },
  { k: "veiculos", l: "Veículos", Comp: VeiculosCad },
];

export default function CadastrosView({ ctx }) {
  const { t, getConexao } = ctx;
  const [sec, setSec] = React.useState(SECOES[0].k);
  const conn = React.useMemo(() => getConexao?.(), [getConexao]);

  const Atual = (SECOES.find((s) => s.k === sec) || SECOES[0]).Comp;

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <PageHeader title="Cadastros" subtitle="Dados compartilhados por todas as telas do app" />

      {SECOES.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {SECOES.map((s) => {
            const on = s.k === sec;
            return (
              <button key={s.k} onClick={() => setSec(s.k)}
                style={{ fontSize: 12, fontWeight: on ? 700 : 500, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                  fontFamily: "inherit", border: `1.5px solid ${on ? t.ouro : t.borda}`,
                  background: on ? t.ouro : "transparent", color: on ? "#1a1a1a" : t.txt2 }}>
                {s.l}
              </button>
            );
          })}
        </div>
      )}

      {conn
        ? <Atual ctx={ctx} conn={conn} />
        : <div style={{ fontSize: 12, color: t.txt2 }}>Sem conexão com o banco configurada.</div>}
    </div>
  );
}
