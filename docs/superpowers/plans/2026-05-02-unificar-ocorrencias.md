# Unificar Ocorrências — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar os 3 pontos de entrada de ocorrências em um único OcorrModal, expandir tipos, adicionar campos de NF/localização, atualizar NFD e incluir status de workflow no RO.

**Architecture:** Criar `src/components/OcorrModal.jsx` como único componente de entrada de ocorrência. App.jsx mantém a função `adicionarOcorrencia` (atualizada para novos campos). Os 3 entry points existentes (ModalDetalhe, mini-modal, OcorrenciasView) são trocados pelo OcorrModal via callbacks. RO status é campo novo no record principal.

**Tech Stack:** React 18, Vite 5, Supabase, localStorage dual-write. Python via bash para editar App.jsx.

---

## TASK 1: OcorrModal component + update adicionarOcorrencia

**Files:**
- Create: `src/components/OcorrModal.jsx`
- Modify: `src/App.jsx` — update `adicionarOcorrencia` to accept `{dt, tipo, texto, nfs, localizacao}`; add state `ocorrModalOpen/setOcorrModalOpen`, `ocorrModalDT/setOcorrModalDT`, `ocorrModalRecord/setOcorrModalRecord`; add helper `abrirOcorrModal(dt, record)`; remove `novaOcorr/setNovaOcorr`, `novaOcorrTipo/setNovaOcorrTipo`

### Step 1: Create OcorrModal.jsx

- [ ] Create `src/components/OcorrModal.jsx` with the full component below

The component receives: `{ open, onClose, onSave, dtRecord, t, hIco, css }`
- `open` (bool) — whether to render
- `onClose` (fn) — called on cancel/close
- `onSave({tipo, texto, nfs, localizacao})` (fn) — called with the new occurrence data
- `dtRecord` (obj|null) — the full DT record, used to read `dtRecord.nf` for NF checkboxes
- `t`, `hIco`, `css` — theme + icon helper + css object (same pattern as all other components)

Internal state: `tipo`, `texto`, `nfs` (Set of selected NF strings), `localizacao`

```jsx
import React, { useState, useEffect } from "react";

const TIPOS = [
  { k: "falta",       l: "Falta",        cor: "#f6465d" },
  { k: "avaria",      l: "Avaria",       cor: "#ff9800" },
  { k: "dev_total",   l: "Dev. Total",   cor: "#9c27b0" },
  { k: "dev_parcial", l: "Dev. Parcial", cor: "#e91e63" },
  { k: "desacordo",   l: "Desacordo",    cor: "#f0b90b" },
  { k: "rod",         l: "ROD",          cor: "#ef5350" },
  { k: "sobra",       l: "Sobra",        cor: "#00e096" },
  { k: "info",        l: "Info",         cor: "#1677ff" },
  { k: "alerta",      l: "Alerta",       cor: "#f6465d" },
  { k: "status",      l: "Status",       cor: "#02c076" },
];

const TIPOS_COM_NF = new Set(["falta", "avaria", "dev_total", "dev_parcial", "desacordo"]);

export default function OcorrModal({ open, onClose, onSave, dtRecord, t, hIco, css }) {
  const [tipo, setTipo] = useState("info");
  const [texto, setTexto] = useState("");
  const [nfs, setNfs] = useState(new Set());
  const [localizacao, setLocalizacao] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTipo("info");
      setTexto("");
      setNfs(new Set());
      setLocalizacao("");
    }
  }, [open]);

  if (!open) return null;

  const nfList = (dtRecord?.nf || "").split(",").map(s => s.trim()).filter(Boolean);

  const toggleNf = (nf) => {
    setNfs(prev => {
      const next = new Set(prev);
      if (next.has(nf)) next.delete(nf);
      else next.add(nf);
      return next;
    });
  };

  const handleSalvar = () => {
    if (!texto.trim()) return;
    onSave({
      tipo,
      texto: texto.trim(),
      nfs: nfs.size > 0 ? [...nfs].join(", ") : undefined,
      localizacao: localizacao.trim() || undefined,
    });
  };

  const tipoAtual = TIPOS.find(t => t.k === tipo) || TIPOS[0];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{
        background: t.bg2 || t.bg,
        border: `1px solid ${t.borda}`,
        borderRadius: 14,
        width: "100%",
        maxWidth: 420,
        padding: "20px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: t.txt, textTransform: "uppercase" }}>
              Nova Ocorrência
            </span>
            {dtRecord && (
              <span style={{
                padding: "2px 8px", borderRadius: 5,
                background: `rgba(22,119,255,0.12)`, color: "#1677ff",
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              }}>
                DT {dtRecord.dt}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: t.txt2, padding: 4, lineHeight: 1 }}
          >
            {hIco(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, t.txt2, 16)}
          </button>
        </div>

        {/* Tipo buttons — 3 per row */}
        <div>
          <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Tipo
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {TIPOS.map(tp => {
              const ativo = tipo === tp.k;
              return (
                <button
                  key={tp.k}
                  onClick={() => setTipo(tp.k)}
                  style={{
                    padding: "6px 4px",
                    borderRadius: 7,
                    border: `1.5px solid ${ativo ? tp.cor : t.borda}`,
                    background: ativo ? `${tp.cor}22` : "transparent",
                    color: ativo ? tp.cor : t.txt2,
                    fontSize: 10,
                    fontWeight: ativo ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {tp.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* NF checkboxes — only for tipos com NF e quando há NFs no record */}
        {TIPOS_COM_NF.has(tipo) && nfList.length > 0 && (
          <div>
            <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              NFs Afetadas
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {nfList.map(nf => {
                const sel = nfs.has(nf);
                return (
                  <button
                    key={nf}
                    onClick={() => toggleNf(nf)}
                    style={{
                      padding: "4px 10px", borderRadius: 6,
                      border: `1.5px solid ${sel ? "#f0b90b" : t.borda}`,
                      background: sel ? "rgba(240,185,11,0.10)" : t.bg,
                      color: sel ? "#f0b90b" : t.txt2,
                      fontSize: 10, fontWeight: sel ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {nf}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Localização — apenas para ROD */}
        {tipo === "rod" && (
          <div>
            <label style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: t.txt2, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Localização da Carga
            </label>
            <input
              value={localizacao}
              onChange={e => setLocalizacao(e.target.value)}
              placeholder="Ex: Em trânsito, SP – RJ km 210"
              style={css.inp}
            />
          </div>
        )}

        {/* Texto */}
        <div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva a ocorrência..."
            rows={3}
            style={{
              ...css.inp,
              width: "100%",
              resize: "vertical",
              minHeight: 72,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${t.borda}`, background: "transparent",
              color: t.txt2, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!texto.trim()}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "none",
              background: texto.trim() ? tipoAtual.cor : t.borda,
              color: texto.trim() ? "#fff" : t.txt2,
              fontSize: 11, fontWeight: 700,
              cursor: texto.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Update adicionarOcorrencia in App.jsx

- [ ] Backup App.jsx before editing
- [ ] Run the Python script below to update `adicionarOcorrencia`

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
shutil.copy('src/App.jsx', 'src/App.jsx.bak_ocorr_task1')
print('Backup OK')
"
```

Then find the exact function signature with:

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'adicionarOcorrencia' in l:
        print(i, repr(l[:100]))
" | head -20
```

After identifying the exact signature line, run:

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()

# Update function signature from positional (dt, tipo, texto) to object destructure
old_sig = 'const adicionarOcorrencia = (dt, tipo, texto)'
new_sig = 'const adicionarOcorrencia = ({dt, tipo, texto, nfs, localizacao})'
if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    print('Signature updated')
else:
    print('WARNING: signature not found, check manually')
    sys.exit(1)

# Update the novaOcorr object construction to include new fields
old_obj = '''const novaOcorr = {
      dt,
      data_hora: new Date().toISOString(),
      tipo,
      texto,
      usuario: usuarioLogado || perfil || \"sistema\",
    };'''
new_obj = '''const novaOcorr = {
      dt,
      data_hora: new Date().toISOString(),
      tipo,
      texto,
      usuario: usuarioLogado || perfil || \"sistema\",
      ...(nfs ? { nfs } : {}),
      ...(localizacao ? { localizacao } : {}),
    };'''
if old_obj in content:
    content = content.replace(old_obj, new_obj, 1)
    print('novaOcorr object updated')
else:
    print('WARNING: novaOcorr object not found verbatim, check manually')

open('src/App.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

### Step 3: Add unified modal state to App.jsx + remove old states

- [ ] Add ocorrModal states via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()

# Find the line with novaOcorr state to anchor insertion
old = 'const [novaOcorr, setNovaOcorr] = useState(\"\");'
new = '''const [ocorrModalOpen, setOcorrModalOpen] = useState(false);
  const [ocorrModalDT, setOcorrModalDT]   = useState(null);
  const [ocorrModalRecord, setOcorrModalRecord] = useState(null);'''
if old in content:
    # Insert before novaOcorr and then remove novaOcorr lines
    content = content.replace(old, new, 1)
    print('Modal states added, old novaOcorr removed')
else:
    print('WARNING: anchor line not found; check manually')
    sys.exit(1)

# Remove novaOcorrTipo state
old2 = 'const [novaOcorrTipo, setNovaOcorrTipo] = useState(\"info\");'
if old2 in content:
    content = content.replace(old2, '', 1)
    print('novaOcorrTipo removed')
else:
    print('WARNING: novaOcorrTipo state not found')

# Remove mini-modal states
for st in [
    'const [ocorrMiniOpen, setOcorrMiniOpen] = useState(false);',
    'const [ocorrMiniDT, setOcorrMiniDT] = useState(null);',
    'const [ocorrMiniTexto, setOcorrMiniTexto] = useState(\"\");',
    'const [ocorrMiniTipo, setOcorrMiniTipo] = useState(\"info\");',
]:
    if st in content:
        content = content.replace(st, '', 1)
        print(f'Removed: {st[:50]}')
    else:
        print(f'Not found (ok if already removed): {st[:50]}')

open('src/App.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

- [ ] Add `abrirOcorrModal` helper via Python (insert after the 3 new states)

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()

anchor = 'const [ocorrModalRecord, setOcorrModalRecord] = useState(null);'
helper = '''const [ocorrModalRecord, setOcorrModalRecord] = useState(null);
  const abrirOcorrModal = useCallback((dt, record=null) => {
    setOcorrModalDT(dt);
    setOcorrModalRecord(record || DADOS.find(d=>d.dt===dt) || null);
    setOcorrModalOpen(true);
  }, [DADOS]);'''
if anchor in content:
    content = content.replace(anchor, helper, 1)
    print('abrirOcorrModal added')
else:
    print('ERROR: anchor not found')
    sys.exit(1)
open('src/App.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

### Step 4: Replace MINI-MODAL OCORRÊNCIAS in App.jsx

- [ ] Find the mini-modal block bounds

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'MINI-MODAL OCORR' in l or 'ocorrMini' in l:
        print(i, repr(l[:100]))
"
```

- [ ] Replace the mini-modal block with `<OcorrModal>` via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
# Find start and end of the mini-modal block
start = None
end = None
depth = 0
for i, l in enumerate(lines):
    if '{/* ═══ MINI-MODAL OCORRÊNCIAS ═══ */}' in l:
        start = i
        print(f'Found start at line {i+1}')
        break
if start is None:
    print('ERROR: start marker not found')
    sys.exit(1)
# Walk forward counting JSX depth to find end
for i in range(start, len(lines)):
    depth += lines[i].count('{') - lines[i].count('}')
    if i > start and depth <= 0:
        end = i
        print(f'Found end at line {i+1}')
        break
if end is None:
    print('ERROR: could not determine block end — check manually')
    sys.exit(1)
print('Lines to replace:', start+1, 'to', end+1)
"
```

After confirming bounds, replace via Python:

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()

# The replacement JSX for the mini-modal block
replacement = '''<OcorrModal
        open={ocorrModalOpen}
        onClose={()=>setOcorrModalOpen(false)}
        onSave={({tipo,texto,nfs,localizacao})=>{
          adicionarOcorrencia({dt:ocorrModalDT, tipo, texto, nfs, localizacao});
          setOcorrModalOpen(false);
        }}
        dtRecord={ocorrModalRecord}
        t={t} hIco={hIco} css={css}
      />'''

marker = '{/* ═══ MINI-MODAL OCORRÊNCIAS ═══ */}'
if marker not in content:
    print('ERROR: marker not found')
    sys.exit(1)

# Find marker, then find the enclosing block end by counting braces
idx = content.index(marker)
# Walk forward to find block end (simplified: find closing tag pattern)
# Safer: replace from marker to end of block by finding the closing comment or next top-level sibling
# Strategy: replace from the comment up to and including the next standalone }); or similar
# Let executor adjust if bounds differ; here we provide a targeted replace using known structure
# Executor should verify exact old block before running
print('Marker found at char', idx)
print('Context (50 chars before/after):')
print(repr(content[idx-20:idx+200]))
"
```

> **Note:** The exact replacement boundaries depend on App.jsx structure. The executor should print the block context, confirm bounds, then do a targeted `content.replace(old_block, replacement, 1)` where `old_block` is the verbatim text from `{/* ═══ MINI-MODAL OCORRÊNCIAS ═══ */}` to the closing `}` of the block.

- [ ] Add OcorrModal import to App.jsx

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()
# Find last import line to insert after
import_line = \"import OcorrModal from './components/OcorrModal.jsx';\"
if import_line in content:
    print('Import already present')
else:
    # Insert after last import statement
    last_import_idx = content.rfind('\nimport ')
    end_of_line = content.index('\n', last_import_idx + 1)
    content = content[:end_of_line+1] + import_line + '\n' + content[end_of_line+1:]
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('Import added')
"
```

### Step 5: Build

- [ ] Run build and confirm success

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
npm run build 2>&1 | tail -5
```

Expected: `✓ built`

### Step 6: Commit

- [ ] Commit Task 1 changes

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
git add src/components/OcorrModal.jsx src/App.jsx
git commit -m "feat: OcorrModal unificado + novos tipos + NFs + ROD localizacao"
```

---

## TASK 2: Wire OcorrModal into ModalDetalhe

**Files:**
- Modify: `src/modals/ModalDetalhe.jsx`

The current ModalDetalhe has an inline occurrence form using `novaOcorr`, `setNovaOcorr`, `novaOcorrTipo`, `setNovaOcorrTipo`, `adicionarOcorrencia`. Replace with a button that opens OcorrModal.

### Step 1: Update ModalDetalhe ctx destructuring

- [ ] Read ModalDetalhe to find exact destructure location

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'novaOcorr' in l or 'ctx' in l:
        print(i, repr(l[:100]))
" | head -20
```

- [ ] Remove `novaOcorr, setNovaOcorr, novaOcorrTipo, setNovaOcorrTipo` from ctx destructure and add `abrirOcorrModal` via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').read()
import re
# Remove old ctx vars
for old in ['novaOcorr,', ', novaOcorr', 'setNovaOcorr,', ', setNovaOcorr',
            'novaOcorrTipo,', ', novaOcorrTipo', 'setNovaOcorrTipo,', ', setNovaOcorrTipo']:
    content = content.replace(old, '', 1) if old in content else content
# Ensure abrirOcorrModal is in ctx destructure
if 'abrirOcorrModal' not in content:
    content = content.replace('adicionarOcorrencia,', 'adicionarOcorrencia, abrirOcorrModal,', 1)
    print('abrirOcorrModal added to destructure')
open('src/modals/ModalDetalhe.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

- [ ] Add local state `ocorrModalLocalOpen` inside the component (after the first `useState` call in the file)

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').read()
local_state = 'const [ocorrModalLocalOpen, setOcorrModalLocalOpen] = React.useState(false);'
if local_state in content:
    print('State already present')
else:
    # Insert after first useState in the component body
    idx = content.find('useState(')
    end = content.index(';', idx) + 1
    content = content[:end] + '\n  ' + local_state + content[end:]
    open('src/modals/ModalDetalhe.jsx', 'w', encoding='utf-8').write(content)
    print('Local state added')
"
```

### Step 2: Replace the inline occurrence form

- [ ] Find the occurrence form section in ModalDetalhe

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'novaOcorr' in l or 'Nova Ocorr' in l or 'novaOcorrTipo' in l:
        print(i, repr(l[:100]))
"
```

- [ ] Replace entire inline form with the button + OcorrModal pattern

The replacement JSX:

```jsx
{canOcorr && (
  <>
    <button
      onClick={()=>setOcorrModalLocalOpen(true)}
      style={{width:"100%",padding:"9px 14px",borderRadius:9,border:`1.5px dashed ${t.borda}`,background:"transparent",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit",marginTop:8}}
    >
      {hIco(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,t.txt2,14)} Nova Ocorrência
    </button>
    <OcorrModal
      open={ocorrModalLocalOpen}
      onClose={()=>setOcorrModalLocalOpen(false)}
      onSave={({tipo,texto,nfs,localizacao})=>{
        adicionarOcorrencia({dt:detalheDT?.dt, tipo, texto, nfs, localizacao});
        setOcorrModalLocalOpen(false);
      }}
      dtRecord={detalheDT}
      t={t} hIco={hIco} css={css}
    />
  </>
)}
```

Apply via Python after verifying the exact old block from the find step above.

### Step 3: Update tipoColors and tipoIcos in ModalDetalhe

- [ ] Find and replace `tipoColors` definition

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'tipoColors' in l or 'tipoIcos' in l:
        print(i, repr(l[:100]))
"
```

- [ ] Replace `tipoColors` object with updated version via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').read()
# Find existing tipoColors and replace entire object
import re
pattern = r'const tipoColors\s*=\s*\{[^}]+\};'
new_colors = '''const tipoColors = {
  info: \"#1677ff\", alerta: t.danger, status: t.verde,
  falta: \"#f6465d\", avaria: \"#ff9800\", dev_total: \"#9c27b0\",
  dev_parcial: \"#e91e63\", desacordo: \"#f0b90b\",
  rod: \"#ef5350\", sobra: \"#00e096\",
};'''
result = re.sub(pattern, new_colors, content, count=1, flags=re.DOTALL)
if result == content:
    print('WARNING: tipoColors not replaced — check pattern')
else:
    open('src/modals/ModalDetalhe.jsx', 'w', encoding='utf-8').write(result)
    print('tipoColors updated')
"
```

### Step 4: Add OcorrModal import to ModalDetalhe.jsx

- [ ] Add import at top of file

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').read()
import_line = \"import OcorrModal from '../components/OcorrModal.jsx';\"
if import_line in content:
    print('Import already present')
else:
    last_import_idx = content.rfind('\nimport ')
    end_of_line = content.index('\n', last_import_idx + 1)
    content = content[:end_of_line+1] + import_line + '\n' + content[end_of_line+1:]
    open('src/modals/ModalDetalhe.jsx', 'w', encoding='utf-8').write(content)
    print('Import added')
"
```

### Step 5: Update App.jsx ctx pass to ModalDetalhe

- [ ] Remove old state refs from ModalDetalhe ctx in App.jsx via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
# Find the ModalDetalhe ctx= call
for i, l in enumerate(lines, 1):
    if 'ModalDetalhe' in l and 'ctx' in l:
        print(i, repr(l[:100]))
    if 'novaOcorr' in l and i > 6000:
        print(i, repr(l[:100]))
" | head -20
```

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()
for old in ['novaOcorr, setNovaOcorr, novaOcorrTipo, setNovaOcorrTipo,',
            'novaOcorr,', 'setNovaOcorr,', 'novaOcorrTipo,', 'setNovaOcorrTipo,']:
    if old in content:
        content = content.replace(old, '', 1)
        print(f'Removed: {old}')
# Ensure abrirOcorrModal is passed in ctx
if 'abrirOcorrModal' not in content:
    content = content.replace('adicionarOcorrencia,', 'adicionarOcorrencia, abrirOcorrModal,', 1)
    print('abrirOcorrModal added to ctx')
open('src/App.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

### Step 6: Build + Commit

- [ ] Build

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
npm run build 2>&1 | tail -5
```

- [ ] Commit

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
git add src/modals/ModalDetalhe.jsx src/App.jsx
git commit -m "feat: ModalDetalhe usa OcorrModal unificado"
```

---

## TASK 3: Wire OcorrModal into OcorrenciasView

**Files:**
- Modify: `src/views/OcorrenciasView.jsx`

OcorrenciasView currently has a `NovaOcorrModal` defined locally. Replace it with OcorrModal.

### Step 1: Read OcorrenciasView to understand NovaOcorrModal

- [ ] Audit current NovaOcorrModal usage

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/views/OcorrenciasView.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'NovaOcorr' in l or 'novaOcorr' in l or 'setOcorrModal' in l or 'abrirOcorr' in l or 'onSalvar' in l:
        print(i, repr(l[:90]))
"
```

- [ ] Also check what props OcorrenciasView receives (especially `t`, `hIco`, `css`)

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/views/OcorrenciasView.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines[:30], 1):
    print(i, repr(l[:100]))
"
```

### Step 2: Replace NovaOcorrModal usage

- [ ] Add OcorrModal import to OcorrenciasView

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/views/OcorrenciasView.jsx', encoding='utf-8').read()
import_line = \"import OcorrModal from '../components/OcorrModal.jsx';\"
if import_line in content:
    print('Import already present')
else:
    last_import_idx = content.rfind('\nimport ')
    end_of_line = content.index('\n', last_import_idx + 1)
    content = content[:end_of_line+1] + import_line + '\n' + content[end_of_line+1:]
    open('src/views/OcorrenciasView.jsx', 'w', encoding='utf-8').write(content)
    print('Import added')
"
```

- [ ] Add unified modal state inside OcorrenciasView component (after first useState call)

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/views/OcorrenciasView.jsx', encoding='utf-8').read()
state_decl = 'const [ocorrModalState, setOcorrModalState] = useState({open:false, dt:null, record:null});'
if state_decl in content:
    print('State already present')
else:
    idx = content.find('useState(')
    end = content.index(';', idx) + 1
    content = content[:end] + '\n  ' + state_decl + content[end:]
    open('src/views/OcorrenciasView.jsx', 'w', encoding='utf-8').write(content)
    print('State added')
"
```

- [ ] Replace `NovaOcorrModal` render call with `<OcorrModal>` and update the "Nova Ocorrência" button click handler

After reading the file in Step 1, use a targeted replace. The new OcorrModal usage:

```jsx
<OcorrModal
  open={ocorrModalState.open}
  onClose={()=>setOcorrModalState({open:false,dt:null,record:null})}
  onSave={({tipo,texto,nfs,localizacao})=>{
    onSalvarOcorrencia(ocorrModalState.dt, tipo, texto, nfs, localizacao);
    setOcorrModalState({open:false,dt:null,record:null});
  }}
  dtRecord={ocorrModalState.record}
  t={t} hIco={hIco} css={css}
/>
```

And "Nova Ocorrência" button handler:

```jsx
onClick={()=>setOcorrModalState({open:true, dt:r.dt, record:r})}
```

Apply via Python after confirming exact old strings from Step 1.

- [ ] Remove the local `NovaOcorrModal` component definition from the file

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/views/OcorrenciasView.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'function NovaOcorrModal' in l or 'const NovaOcorrModal' in l:
        print(i, repr(l[:100]))
"
```

After finding the bounds, remove the entire `NovaOcorrModal` function via Python replace.

### Step 3: Update onSalvarOcorrencia signature in App.jsx

- [ ] Find the function in App.jsx

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'salvarOcorrenciaExterna' in l or 'onSalvarOcorrencia' in l:
        print(i, repr(l[:100]))
" | head -10
```

- [ ] Update to pass new fields to `adicionarOcorrencia`

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()
# Update signature from (dt, tipo, texto) to (dt, tipo, texto, nfs, localizacao)
old = 'const salvarOcorrenciaExterna = (dt, tipo, texto) =>'
new = 'const salvarOcorrenciaExterna = (dt, tipo, texto, nfs, localizacao) =>'
if old in content:
    content = content.replace(old, new, 1)
    print('Signature updated')
else:
    print('WARNING: exact signature not found — check and adjust manually')
# Update internal call
old_call = 'adicionarOcorrencia(dt, tipo, texto)'
new_call = 'adicionarOcorrencia({dt, tipo, texto, nfs, localizacao})'
if old_call in content:
    content = content.replace(old_call, new_call, 1)
    print('Internal call updated')
open('src/App.jsx', 'w', encoding='utf-8').write(content)
print('Done')
"
```

### Step 4: Build + Commit

- [ ] Build

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
npm run build 2>&1 | tail -5
```

- [ ] Commit

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
git add src/views/OcorrenciasView.jsx src/App.jsx
git commit -m "feat: OcorrenciasView usa OcorrModal unificado"
```

---

## TASK 4: NFD modal — mesmos campos de ocorrência

**Files:**
- Modify: `src/App.jsx` (NFD modal section, ~line 5938)

The NFD modal currently has: tipo (avaria/falta/devolução/sobra), numero, valor, fotos.
Update it to have: tipo using same TIPOS list, nfs checkboxes (from formData.nf), localizacao (for rod tipo).

### Step 1: Find NFD modal bounds

- [ ] Locate NFD modal in App.jsx

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'NFD' in l and ('{/*' in l or 'nfdForm' in l or ('nfd' in l.lower() and 'useState' in l)):
        print(i, repr(l[:80]))
" | head -15
```

### Step 2: Update nfdForm state initial value in App.jsx

- [ ] Find and update nfdForm initial state

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()
old = 'useState({numero:\"\", valor:\"\", tipo:\"avaria\"})'
new = 'useState({numero:\"\", valor:\"\", tipo:\"avaria\", nfs:\"\", localizacao:\"\"})'
if old in content:
    content = content.replace(old, new, 1)
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('nfdForm initial state updated')
else:
    print('WARNING: exact string not found — check quotes and spacing manually')
    # Print nearby lines for debugging
    for i, l in enumerate(content.splitlines(), 1):
        if 'nfdForm' in l and 'useState' in l:
            print(i, repr(l[:100]))
"
```

### Step 3: Update NFD modal JSX — tipo buttons, NF checkboxes, localizacao field

- [ ] Add TIPOS_NFD and TIPOS_COM_NF constants at the top of the NFD modal section

Find the opening of the NFD modal block and insert constants:

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'NFD' in l and '{/*' in l:
        # Print surrounding context
        for j in range(max(0,i-2), min(len(lines),i+5)):
            print(j+1, repr(lines[j][:100]))
        print('---')
" | head -30
```

After finding the opening comment, insert before the NFD modal JSX block:

```js
const TIPOS_COM_NF = new Set(["falta","avaria","dev_total","dev_parcial","desacordo"]);
const TIPOS_NFD = [
  {k:"avaria",    l:"Avaria",        cor:"#ff9800"},
  {k:"falta",     l:"Falta",         cor:"#f6465d"},
  {k:"dev_total", l:"Dev. Total",     cor:"#9c27b0"},
  {k:"dev_parcial",l:"Dev. Parcial",  cor:"#e91e63"},
  {k:"desacordo", l:"Desacordo",     cor:"#f0b90b"},
  {k:"rod",       l:"ROD",           cor:"#ef5350"},
  {k:"sobra",     l:"Sobra",         cor:"#00e096"},
];
const nfList = (formData?.nf||"").split(",").map(s=>s.trim()).filter(Boolean);
```

- [ ] Replace radio buttons with tipo button grid in NFD modal

Find the radio input group for NFD tipo (search for `avaria` or `devolução` near the NFD modal), then replace with:

```jsx
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
  {TIPOS_NFD.map(tp=>{
    const ativo = nfdForm.tipo===tp.k;
    return (
      <button key={tp.k} onClick={()=>setNfdForm(p=>({...p,tipo:tp.k}))}
        style={{padding:"6px 4px",borderRadius:7,border:`1.5px solid ${ativo?tp.cor:t.borda}`,
          background:ativo?`${tp.cor}22`:"transparent",color:ativo?tp.cor:t.txt2,
          fontSize:10,fontWeight:ativo?700:400,cursor:"pointer",fontFamily:"inherit"}}>
        {tp.l}
      </button>
    );
  })}
</div>
```

- [ ] Add NF checkboxes section after tipo buttons

```jsx
{TIPOS_COM_NF.has(nfdForm.tipo) && nfList.length > 0 && (
  <div>
    <div style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>NFs Afetadas</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {nfList.map(nf => {
        const sel = nfdForm.nfs.split(",").map(s=>s.trim()).includes(nf);
        return (
          <button key={nf} onClick={()=>{
            const cur = nfdForm.nfs.split(",").map(s=>s.trim()).filter(Boolean);
            const next = sel ? cur.filter(x=>x!==nf) : [...cur, nf];
            setNfdForm(p=>({...p, nfs: next.join(", ")}));
          }} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${sel?t.ouro:t.borda}`,
            background:sel?"rgba(240,185,11,.1)":t.bg,color:sel?t.ouro:t.txt2,
            fontSize:10,fontWeight:sel?700:400,cursor:"pointer"}}>
            {nf}
          </button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] Add localizacao field after NF checkboxes section

```jsx
{nfdForm.tipo === "rod" && (
  <div>
    <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Localização da Carga</label>
    <input value={nfdForm.localizacao||""} onChange={e=>setNfdForm(p=>({...p,localizacao:e.target.value}))} placeholder="Ex: Em trânsito, SP – RJ km 210" style={css.inp} />
  </div>
)}
```

Apply all JSX replacements via Python after locating exact existing strings.

### Step 4: Update nfd save object to include new fields

- [ ] Find and update nfdData construction in App.jsx

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/App.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'nfdData' in l or ('nfd:' in l and 'tipo' in l):
        print(i, repr(l[:100]))
" | head -15
```

After finding the save object, update via Python to add `nfs` and `localizacao`:

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/App.jsx', encoding='utf-8').read()
# Adjust old_obj to match exact existing code after reading
old_obj = '''const nfdData = {
        tipo: nfdForm.tipo,
        numero: nfdForm.numero,
        valor: nfdForm.valor,
        fotos: fotoUrls,
      };'''
new_obj = '''const nfdData = {
        tipo: nfdForm.tipo,
        numero: nfdForm.numero,
        valor: nfdForm.valor,
        ...(nfdForm.nfs ? { nfs: nfdForm.nfs } : {}),
        ...(nfdForm.localizacao ? { localizacao: nfdForm.localizacao } : {}),
        fotos: fotoUrls,
      };'''
if old_obj in content:
    content = content.replace(old_obj, new_obj, 1)
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('nfdData updated')
else:
    print('WARNING: exact nfdData block not found — check indentation/structure manually')
"
```

### Step 5: Build + Commit

- [ ] Build

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
npm run build 2>&1 | tail -5
```

- [ ] Commit

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
git add src/App.jsx
git commit -m "feat: NFD modal com mesmos campos de ocorrencia (tipos, NFs, localizacao)"
```

---

## TASK 5: ro_status — campo de workflow no RO

**Files:**
- Modify: `src/constants.js` — add `ro_status` to SUPA_KNOWN_COLS
- Modify: `src/modals/ModalEdit.jsx` — add `ro_status` field in Documentação section
- Modify: `src/modals/ModalDetalhe.jsx` — show `ro_status` next to `r.ro`
- Modify: `src/views/OcorrenciasView.jsx` — show status badge on RO cards

### Step 1: Add ro_status to SUPA_KNOWN_COLS in constants.js

- [ ] Read the file to find the exact string around `ro_hora`

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/constants.js', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'ro_hora' in l or 'ro\"' in l or 'SUPA_KNOWN' in l:
        print(i, repr(l[:100]))
"
```

- [ ] Add `"ro_status"` next to `"ro_hora"` via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/constants.js', encoding='utf-8').read()
# Try comma-on-same-line variant first
for old, new in [
    ('\"ro\",\"ro_hora\"',       '\"ro\",\"ro_hora\",\"ro_status\"'),
    ('\"ro\", \"ro_hora\"',      '\"ro\", \"ro_hora\", \"ro_status\"'),
    (\"'ro','ro_hora'\",         \"'ro','ro_hora','ro_status'\"),
    ('\"ro_hora\"',              '\"ro_hora\",\"ro_status\"'),
]:
    if old in content:
        content = content.replace(old, new, 1)
        open('src/constants.js', 'w', encoding='utf-8').write(content)
        print(f'Replaced: {old} -> {new}')
        break
else:
    print('WARNING: no matching pattern found — check manually')
"
```

### Step 2: Add ro_status field to ModalEdit Documentação section

- [ ] Find the Documentação fields array in ModalEdit.jsx

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/modals/ModalEdit.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'ro_hora' in l or 'ro\"' in l or 'Documentação' in l or 'documentacao' in l.lower():
        print(i, repr(l[:100]))
"
```

- [ ] Insert `ro_status` field after `ro_hora` via Python

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
content = open('src/modals/ModalEdit.jsx', encoding='utf-8').read()
# Adjust old string after reading actual file
for old, new in [
    ('{k:\"ro_hora\",l:\"Hora RO\"}',
     '{k:\"ro_hora\",l:\"Hora RO\"},{k:\"ro_status\",l:\"Status RO\",type:\"select_opts\",opts:[\"EM TRATATIVA\",\"FINALIZADO\"]}'),
    ('{k: \"ro_hora\", l: \"Hora RO\"}',
     '{k: \"ro_hora\", l: \"Hora RO\"}, {k: \"ro_status\", l: \"Status RO\", type: \"select_opts\", opts: [\"EM TRATATIVA\", \"FINALIZADO\"]}'),
]:
    if old in content:
        content = content.replace(old, new, 1)
        open('src/modals/ModalEdit.jsx', 'w', encoding='utf-8').write(content)
        print(f'Field added: {old[:40]} ...')
        break
else:
    print('WARNING: ro_hora field not found with expected format — check manually')
"
```

### Step 3: Show ro_status in ModalDetalhe

- [ ] Find where `r.ro` is displayed in ModalDetalhe

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'r.ro' in l and ('ro_hora' not in l):
        print(i, repr(l[:100]))
" | head -10
```

- [ ] Add `ro_status` badge next to `r.ro` via Python

After identifying the exact old JSX for the RO row, replace with:

```jsx
{r.ro && (
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    <span style={{fontWeight:700,color:t.txt}}>{r.ro}</span>
    {r.ro_status && (
      <span style={{
        padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,
        background: r.ro_status==="FINALIZADO"?"rgba(2,192,118,.1)":"rgba(240,185,11,.1)",
        color: r.ro_status==="FINALIZADO"?t.verde:t.ouro,
        border:`1px solid ${r.ro_status==="FINALIZADO"?"rgba(2,192,118,.3)":"rgba(240,185,11,.3)"}`,
        textTransform:"uppercase",letterSpacing:0.5
      }}>
        {r.ro_status}
      </span>
    )}
  </div>
)}
```

Apply via Python after reading exact existing block.

### Step 4: Show ro_status badge in OcorrenciasView

- [ ] Find the RO badge in OcorrenciasView

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
lines = open('src/views/OcorrenciasView.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'r.ro' in l or 'RO {' in l:
        print(i, repr(l[:100]))
" | head -10
```

- [ ] Add `ro_status` badge right after the existing RO badge via Python

```jsx
{r.ro_status && (
  <span style={{
    padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,
    background:r.ro_status==="FINALIZADO"?"rgba(2,192,118,.1)":"rgba(240,185,11,.1)",
    color:r.ro_status==="FINALIZADO"?"#02c076":"#f0b90b",
    border:`1px solid ${r.ro_status==="FINALIZADO"?"rgba(2,192,118,.3)":"rgba(240,185,11,.3)"}`,
  }}>
    {r.ro_status}
  </span>
)}
```

Apply via Python after reading exact existing badge code.

### Step 5: Build + Commit

- [ ] Build

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
npm run build 2>&1 | tail -5
```

- [ ] Commit

```bash
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
git add src/constants.js src/modals/ModalEdit.jsx src/modals/ModalDetalhe.jsx src/views/OcorrenciasView.jsx
git commit -m "feat: ro_status (Em Tratativa/Finalizado) em RO"
```

---

## Self-review: Requirements Coverage

| # | Requirement | Covered in |
|---|---|---|
| 1 | **Unify** — Single `OcorrModal` replaces all 3 entry points | Task 1 (create OcorrModal), Task 2 (ModalDetalhe), Task 3 (OcorrenciasView) |
| 2 | **New tipos** — `falta`, `avaria`, `dev_total`, `dev_parcial`, `desacordo`, `rod` + keep legacy tipos for display | Task 1 (TIPOS constant in OcorrModal), Task 2 (tipoColors in ModalDetalhe updated), Task 4 (TIPOS_NFD) |
| 3 | **Multiple NFs** — parse `dtRecord.nf`, show checkboxes, store in `nfs` field as comma-separated | Task 1 (OcorrModal NF checkbox section), Task 4 (NFD modal NF checkboxes) |
| 4 | **ROD + localização** — extra field when `tipo === "rod"` | Task 1 (OcorrModal localizacao input), Task 4 (NFD modal localizacao input) |
| 5 | **NFD fields** — gains same tipos + NFs + localizacao | Task 4 (full NFD modal update in App.jsx) |
| 6 | **RO status** — `ro_status` dropdown in ModalEdit, badge in ModalDetalhe + OcorrenciasView | Task 5 (constants.js, ModalEdit, ModalDetalhe, OcorrenciasView) |

All 6 requirements are fully covered. Each task ends with a build verification step and an atomic commit. Python-via-bash is used exclusively for all App.jsx edits (8000+ lines), in accordance with CLAUDE.md rules.
