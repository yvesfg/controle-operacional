from pathlib import Path

# ── Create src/utils/apontMappers.js ────────────────────────────────────────
mappers_js = """\
export const apontToSupabase = (a) => ({
  apontamento:           a.numero || a.apontamento,
  item:                  a.item   ? parseInt(a.item)  : null,
  linha:                 a.linha  ? parseInt(a.linha) : null,
  descricao_apontamento: a.descricao_apontamento || null,
  pedido:                a.pedido || null,
  valor_rs:              a.valor  ? parseFloat(String(a.valor).replace(",",".")) : null,
  filial:                a.filial || null,
  tipo:                  a.tipo   || "descarga",
  dt_relacionado:        a.dt_rel || a.dt_relacionado || null,
  folha_registro:        a.frs_folha || a.folha_registro || null,
  nf_numero:             a.nf_numero || null,
  data_emissao:          a.data_emissao || null,
  cidade:                a.cidade || null,
  periodo_referente:     a.mes_ref || a.periodo_referente || null,
  data_apontamento:      a.data_apontamento || null,
});

export const apontFromSupabase = (r) => ({
  id:                    r.id,
  numero:                r.apontamento,
  apontamento:           r.apontamento,
  item:                  r.item   != null ? String(r.item)  : "",
  linha:                 r.linha  != null ? String(r.linha) : "",
  descricao_apontamento: r.descricao_apontamento || "",
  pedido:                r.pedido || "",
  mes_ref:               r.periodo_referente || "",
  periodo_referente:     r.periodo_referente || "",
  filial:                r.filial || "",
  valor:                 r.valor_rs != null ? String(r.valor_rs) : "",
  frs_folha:             r.folha_registro || "",
  folha_registro:        r.folha_registro || "",
  tipo:                  r.tipo || "descarga",
  dt_rel:                r.dt_relacionado || "",
  dt_relacionado:        r.dt_relacionado || "",
  nf_numero:             r.nf_numero || "",
  data_emissao:          r.data_emissao || "",
  cidade:                r.cidade || "",
  data_apontamento:      r.data_apontamento || "",
  criado_em:             r.created_at || "",
  updated_at:            r.updated_at || "",
  status_alerta:         r.status_alerta || false,
});
"""

utils_dir = Path("src/utils")
utils_dir.mkdir(exist_ok=True)
(utils_dir / "apontMappers.js").write_text(mappers_js, encoding="utf-8")
print("Created src/utils/apontMappers.js")

# ── Modify App.jsx ──────────────────────────────────────────────────────────
app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# 1. Add import after supabase import
OLD_IMPORT = "import { supaFetch, supaStorageUpload } from './supabase.js';"
NEW_IMPORT = """import { supaFetch, supaStorageUpload } from './supabase.js';
import { apontToSupabase, apontFromSupabase } from './utils/apontMappers.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Remove the inline function bodies from App.jsx
OLD_BLOCK = """  // Sincronizar usuários do Supabase
  // ── Helpers de mapeamento co_apontamentos ──────────────────────────────
  const apontToSupabase = (a) => ({
    apontamento:           a.numero || a.apontamento,
    item:                  a.item   ? parseInt(a.item)  : null,
    linha:                 a.linha  ? parseInt(a.linha) : null,
    descricao_apontamento: a.descricao_apontamento || null,
    pedido:                a.pedido || null,
    valor_rs:              a.valor  ? parseFloat(String(a.valor).replace(",",".")) : null,
    filial:                a.filial || null,
    tipo:                  a.tipo   || "descarga",
    dt_relacionado:        a.dt_rel || a.dt_relacionado || null,
    folha_registro:        a.frs_folha || a.folha_registro || null,
    nf_numero:             a.nf_numero || null,
    data_emissao:          a.data_emissao || null,
    cidade:                a.cidade || null,
    periodo_referente:     a.mes_ref || a.periodo_referente || null,
    data_apontamento:      a.data_apontamento || null,
  });
  const apontFromSupabase = (r) => ({
    id:                    r.id,
    numero:                r.apontamento,
    apontamento:           r.apontamento,
    item:                  r.item   != null ? String(r.item)  : "",
    linha:                 r.linha  != null ? String(r.linha) : "",
    descricao_apontamento: r.descricao_apontamento || "",
    pedido:                r.pedido || "",
    mes_ref:               r.periodo_referente || "",
    periodo_referente:     r.periodo_referente || "",
    filial:                r.filial || "",
    valor:                 r.valor_rs != null ? String(r.valor_rs) : "",
    frs_folha:             r.folha_registro || "",
    folha_registro:        r.folha_registro || "",
    tipo:                  r.tipo || "descarga",
    dt_rel:                r.dt_relacionado || "",
    dt_relacionado:        r.dt_relacionado || "",
    nf_numero:             r.nf_numero || "",
    data_emissao:          r.data_emissao || "",
    cidade:                r.cidade || "",
    data_apontamento:      r.data_apontamento || "",
    criado_em:             r.created_at || "",
    updated_at:            r.updated_at || "",
    status_alerta:         r.status_alerta || false,
  });"""

NEW_BLOCK = "  // apontToSupabase / apontFromSupabase — via src/utils/apontMappers.js"
assert content.count(OLD_BLOCK) == 1, f"Block not found/unique"
content = content.replace(OLD_BLOCK, NEW_BLOCK, 1)

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
