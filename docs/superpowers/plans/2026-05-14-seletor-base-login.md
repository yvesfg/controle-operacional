# Seletor de Base Operacional no Login — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar seletor de base operacional (Imperatriz/Belém vs Maracanau) na tela de login, com permissões por usuário controladas pelo admin.

**Architecture:** Objeto `BASES` em `constants.js` mapeia id→tabela. Estado `baseAtual` em `App.jsx` guarda a base ativa; um `useRef` expõe o valor atual para dentro de callbacks sem alterar deps arrays. Após auth, o app carrega `bases_permitidas` do usuário e exibe o seletor se necessário. `AdminView` recebe `baseAtual` via ctx para filtrar status de sync e permitir edição de bases por usuário.

**Tech Stack:** React 18, Supabase REST, Python (edição de App.jsx grande), PowerShell (Windows)

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/constants.js` | Modificar | Adicionar objeto `BASES` |
| `src/App.jsx` | Modificar via Python | Estado base, login flow, seletor UI, queries, logout, passar ctx |
| `src/views/AdminView.jsx` | Modificar via Edit | Chave de sync status por base + checkboxes bases_permitidas |

> **Regra do projeto:** Nunca usar Edit/Write diretamente no App.jsx. Usar Python via PowerShell.
> Criar backup antes de cada alteração: `arquivo.bak_YYYYMMDD_HHMMSS`.

---

## Task 1: Adicionar BASES em constants.js

**Files:**
- Modify: `src/constants.js:41`

- [ ] **Step 1: Backup do arquivo**

```powershell
$d = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src\constants.js" "src\constants.js.bak_$d"
```

- [ ] **Step 2: Adicionar BASES logo após a linha TABLE**

Abrir `src/constants.js`. Localizar a linha:
```js
export const TABLE = "controle_operacional";
```
Substituir por:
```js
export const TABLE = "controle_operacional";

// ── Bases operacionais — mapeia id → tabela Supabase ──────────
// Para adicionar Belém independente: inserir entrada aqui + criar tabela no Supabase.
export const BASES = {
  imperatriz_belem: { id: "imperatriz_belem", label: "Imperatriz / Belém", table: "controle_operacional" },
  maracanau:        { id: "maracanau",        label: "Maracanau",           table: "controle_operacional_maracanau" },
};
```

Usar o `Edit` tool (constants.js é pequeno — não há risco de truncamento).

- [ ] **Step 3: Atualizar o import de BASES em App.jsx**

Localizar em `src/App.jsx` a linha:
```js
import { themes, TABLE, TABLE_USUARIOS, TABLE_CONFIG, TABLE_OCORR, TABLE_LOGS, TABLE_APOINTS,
  MESES_LABEL, PERMS_PADRAO, PERMS_LISTA, DESIGN, hexRgb,
  DEV_CHANGELOG, ENV_SUPA_URL, ENV_SUPA_KEY } from './constants.js';
```
Substituir por (Python script — ver passo seguinte):
```js
import { themes, TABLE, BASES, TABLE_USUARIOS, TABLE_CONFIG, TABLE_OCORR, TABLE_LOGS, TABLE_APOINTS,
  MESES_LABEL, PERMS_PADRAO, PERMS_LISTA, DESIGN, hexRgb,
  DEV_CHANGELOG, ENV_SUPA_URL, ENV_SUPA_KEY } from './constants.js';
```

Salvar script Python como `scripts\patch_01_import.py`:
```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

OLD = "import { themes, TABLE, TABLE_USUARIOS"
NEW = "import { themes, TABLE, BASES, TABLE_USUARIOS"

assert OLD in content, "ERRO: padrão não encontrado em App.jsx"
content = content.replace(OLD, NEW, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_01 OK")
```

Executar:
```powershell
cd "C:\Users\yvesf\DevYFGroup\controle operacional"
python scripts\patch_01_import.py
```

- [ ] **Step 4: Verificar**

```powershell
Select-String -Path "src\App.jsx" -Pattern "BASES" | Select-Object -First 3 | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
```
Esperado: linha com `import { themes, TABLE, BASES, TABLE_USUARIOS`.

- [ ] **Step 5: Commit**

```powershell
git add src\constants.js src\App.jsx
git commit -m "feat: add BASES config to constants + import"
```

---

## Task 2: Adicionar estado baseAtual + tblRef em App.jsx

**Files:**
- Modify: `src/App.jsx` (via Python)

Estado `baseAtual` guarda a base selecionada (`{ id, label, table }` ou `null`).  
`tblRef` é um ref atualizado a cada mudança de `baseAtual` — usado dentro de callbacks sem alterar dep arrays.  
`basesPermitidas` guarda as bases que o usuário logado pode acessar.

- [ ] **Step 1: Backup**

```powershell
$d = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src\App.jsx" "src\App.jsx.bak_$d"
```

- [ ] **Step 2: Criar script patch_02_state.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Insere os novos estados logo após a declaração de aprovarPerfil
OLD = '  const [aprovarPerfil, setAprovarPerfil] = useState("operador");'

NEW = '''  const [aprovarPerfil, setAprovarPerfil] = useState("operador");

  // ── Base operacional ──────────────────────────────────────────
  const [baseAtual, setBaseAtualState] = useState(() => {
    try { const s = localStorage.getItem("co_base_atual"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [basesPermitidas, setBasesPermitidas] = useState([]);
  // Helper: persiste no localStorage ao mesmo tempo que seta o estado
  const setBaseAtual = (base) => {
    if (base) localStorage.setItem("co_base_atual", JSON.stringify(base));
    else localStorage.removeItem("co_base_atual");
    setBaseAtualState(base);
  };
  // Ref sempre atualizado — usado em callbacks (useCallback) sem precisar alterar dep arrays
  const tblRef = useRef(BASES.imperatriz_belem.table);
  useEffect(() => { tblRef.current = baseAtual?.table ?? BASES.imperatriz_belem.table; }, [baseAtual]);'''

assert OLD in content, "ERRO: padrão aprovarPerfil não encontrado"
content = content.replace(OLD, NEW, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_02 OK")
```

- [ ] **Step 3: Executar**

```powershell
python scripts\patch_02_state.py
```

- [ ] **Step 4: Verificar**

```powershell
Select-String -Path "src\App.jsx" -Pattern "tblRef|basesPermitidas|setBaseAtual" | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
```
Esperado: linhas com `tblRef`, `basesPermitidas`, `setBaseAtual`.

- [ ] **Step 5: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: add baseAtual state + tblRef + basesPermitidas"
```

---

## Task 3: Substituir TABLE por tblRef.current nas queries

**Files:**
- Modify: `src/App.jsx` (via Python) — 5 ocorrências

As 5 queries que usam `TABLE` são:
1. `sincronizar` — GET todos os registros
2. `handleSalvar` — POST nova DT (2 variantes)
3. `handleDeletar` — DELETE por dt
4. `handleSalvarEdicao` — PATCH por dt

- [ ] **Step 1: Criar script patch_03_queries.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

replacements = [
    # sincronizar — GET
    ('`${TABLE}?select=*&order=id.asc', '`${tblRef.current}?select=*&order=id.asc'),
    # handleSalvar — POST (dois formatos, um sem conflito e um com)
    ('"POST", TABLE, [clean]', '"POST", tblRef.current, [clean]'),
    ('"POST", TABLE, [safeClean]', '"POST", tblRef.current, [safeClean]'),
    # handleDeletar — DELETE
    ('`${TABLE}?dt=eq.${encodeURIComponent(dt)}`', '`${tblRef.current}?dt=eq.${encodeURIComponent(dt)}`'),
    # handleSalvarEdicao — PATCH
    ('`${TABLE}?dt=eq.${encodeURIComponent(detalheDT.dt)}`', '`${tblRef.current}?dt=eq.${encodeURIComponent(detalheDT.dt)}`'),
]

for old, new in replacements:
    assert old in content, f"ERRO: padrão não encontrado:\n  {old}"
    content = content.replace(old, new, 1)
    print(f"OK: {old[:60]}...")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_03 COMPLETO — 5 substituições")
```

- [ ] **Step 2: Executar**

```powershell
python scripts\patch_03_queries.py
```
Esperado: 5 linhas "OK:" seguidas de "patch_03 COMPLETO".

- [ ] **Step 3: Verificar — não deve sobrar nenhum uso de TABLE em queries**

```powershell
Select-String -Path "src\App.jsx" -Pattern 'supaFetch.*TABLE[^_]' | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
```
Esperado: nenhum resultado.

```powershell
Select-String -Path "src\App.jsx" -Pattern 'tblRef\.current' | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
```
Esperado: 5 resultados.

- [ ] **Step 4: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: use tblRef.current for all data queries (base-aware)"
```

---

## Task 4: Atualizar handleLogin e OAuth callback para carregar basesPermitidas

**Files:**
- Modify: `src/App.jsx` (via Python) — 3 pontos de auth

Após cada auth bem-sucedido, carregar `bases_permitidas` do usuário e setar `basesPermitidas`. Se múltiplas bases → mostra picker. Se uma → auto-seleciona.

- [ ] **Step 1: Criar script patch_04_auth.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# ── Helper inline reutilizado nos 3 pontos ──────────────────────
# Após auth admin (bypass Supabase — tem acesso a todas as bases)
OLD_ADMIN = '''        setPerfil(p); setPerms(pm); setAuthed(true);
        setUsuarioLogado("Admin");
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:"Admin",ts:Date.now()});
        registrarLog("LOGIN", `Admin logou no sistema (admin) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
        setAuthSenha(""); setAuthEmail("");'''

NEW_ADMIN = '''        setPerfil(p); setPerms(pm); setAuthed(true);
        setUsuarioLogado("Admin");
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:"Admin",ts:Date.now()});
        registrarLog("LOGIN", `Admin logou no sistema (admin) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
        setAuthSenha(""); setAuthEmail("");
        // Admin tem acesso a todas as bases
        const _todasAdmin = Object.values(BASES);
        setBasesPermitidas(_todasAdmin);
        const _savedAdm = (() => { try { const s = localStorage.getItem("co_base_atual"); return s ? JSON.parse(s) : null; } catch { return null; } })();
        if (!_savedAdm || !_todasAdmin.find(b => b.id === _savedAdm.id)) {
          setBaseAtual(_todasAdmin.length === 1 ? _todasAdmin[0] : null);
        }'''

assert OLD_ADMIN in content, "ERRO: bloco admin login não encontrado"
content = content.replace(OLD_ADMIN, NEW_ADMIN, 1)
print("OK: admin login")

# ── Auth usuário regular (email/senha) ────────────────────────
OLD_USER = '''      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado(found.nome || found.email);
      saveJSON("co_sessao",{perfil:p,perms:pm,nome:found.nome||found.email,ts:Date.now()});
      registrarLog("LOGIN", `${found.nome||found.email} logou no sistema (${p}) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
      setAuthSenha(""); setAuthEmail("");'''

NEW_USER = '''      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado(found.nome || found.email);
      saveJSON("co_sessao",{perfil:p,perms:pm,nome:found.nome||found.email,ts:Date.now()});
      registrarLog("LOGIN", `${found.nome||found.email} logou no sistema (${p}) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
      setAuthSenha(""); setAuthEmail("");
      // Carregar bases permitidas do usuário
      const _idsUsr = Array.isArray(found.bases_permitidas) ? found.bases_permitidas
        : (typeof found.bases_permitidas === "string" ? JSON.parse(found.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]);
      const _basesUsr = _idsUsr.map(id => BASES[id]).filter(Boolean);
      const _permitidasUsr = _basesUsr.length ? _basesUsr : [BASES.imperatriz_belem];
      setBasesPermitidas(_permitidasUsr);
      const _savedUsr = (() => { try { const s = localStorage.getItem("co_base_atual"); return s ? JSON.parse(s) : null; } catch { return null; } })();
      if (!_savedUsr || !_permitidasUsr.find(b => b.id === _savedUsr.id)) {
        setBaseAtual(_permitidasUsr.length === 1 ? _permitidasUsr[0] : null);
      }'''

assert OLD_USER in content, "ERRO: bloco user login não encontrado"
content = content.replace(OLD_USER, NEW_USER, 1)
print("OK: user login (email/senha)")

# ── Auth OAuth (Google) ───────────────────────────────────────
OLD_OAUTH = '''            const p = u.perfil || "visualizador";
            const pm = typeof u.perms === "string" ? JSON.parse(u.perms) : (u.perms || {...PERMS_PADRAO[p]});
            setPerfil(p); setPerms(pm); setAuthed(true);
            setUsuarioLogado(u.nome || u.email);
            saveJSON("co_sessao", {perfil:p, perms:pm, nome:u.nome||u.email, ts:Date.now()});
            showToast(`✅ Login social realizado — bem-vindo, ${u.nome||u.email}!`, "ok");'''

NEW_OAUTH = '''            const p = u.perfil || "visualizador";
            const pm = typeof u.perms === "string" ? JSON.parse(u.perms) : (u.perms || {...PERMS_PADRAO[p]});
            setPerfil(p); setPerms(pm); setAuthed(true);
            setUsuarioLogado(u.nome || u.email);
            saveJSON("co_sessao", {perfil:p, perms:pm, nome:u.nome||u.email, ts:Date.now()});
            showToast(`✅ Login social realizado — bem-vindo, ${u.nome||u.email}!`, "ok");
            // Carregar bases permitidas do usuário OAuth
            const _idsOAuth = Array.isArray(u.bases_permitidas) ? u.bases_permitidas
              : (typeof u.bases_permitidas === "string" ? JSON.parse(u.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]);
            const _basesOAuth = _idsOAuth.map(id => BASES[id]).filter(Boolean);
            const _permitidasOAuth = _basesOAuth.length ? _basesOAuth : [BASES.imperatriz_belem];
            setBasesPermitidas(_permitidasOAuth);
            const _savedOAuth = (() => { try { const s = localStorage.getItem("co_base_atual"); return s ? JSON.parse(s) : null; } catch { return null; } })();
            if (!_savedOAuth || !_permitidasOAuth.find(b => b.id === _savedOAuth.id)) {
              setBaseAtual(_permitidasOAuth.length === 1 ? _permitidasOAuth[0] : null);
            }'''

assert OLD_OAUTH in content, "ERRO: bloco OAuth login não encontrado"
content = content.replace(OLD_OAUTH, NEW_OAUTH, 1)
print("OK: OAuth login")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_04 COMPLETO — 3 pontos de auth atualizados")
```

- [ ] **Step 2: Executar**

```powershell
python scripts\patch_04_auth.py
```
Esperado: 3 linhas "OK:" + "patch_04 COMPLETO".

- [ ] **Step 3: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: load bases_permitidas after login (email, oauth, admin)"
```

---

## Task 5: Adicionar seletor de base na UI + limpar no logout

**Files:**
- Modify: `src/App.jsx` (via Python) — render do picker + handleLogout

O seletor aparece quando `authed === true` e `baseAtual === null` e `basesPermitidas.length > 1`.  
Reutiliza o mesmo container/estilos da tela de login existente.

- [ ] **Step 1: Criar script patch_05_picker_logout.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# ── 1. Limpar base no logout ─────────────────────────────────
OLD_LOGOUT = '''  const handleLogout = () => {
    registrarLog("LOGOUT", `${usuarioLogado||perfil||"usuário"} saiu do sistema · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
    localStorage.removeItem("co_sessao");
    setAuthed(false); setPerfil(null); setPerms({});
    setActiveTab("dashboard"); setAuthSenha(""); setAuthEmail("");
    setUsuarioLogado(null);
  };'''

NEW_LOGOUT = '''  const handleLogout = () => {
    registrarLog("LOGOUT", `${usuarioLogado||perfil||"usuário"} saiu do sistema · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
    localStorage.removeItem("co_sessao");
    setAuthed(false); setPerfil(null); setPerms({});
    setActiveTab("dashboard"); setAuthSenha(""); setAuthEmail("");
    setUsuarioLogado(null);
    setBasesPermitidas([]);
    setBaseAtual(null);
  };'''

assert OLD_LOGOUT in content, "ERRO: handleLogout não encontrado"
content = content.replace(OLD_LOGOUT, NEW_LOGOUT, 1)
print("OK: handleLogout atualizado")

# ── 2. Adicionar render do seletor de base ────────────────────
# Inserir APÓS o bloco if (!authed) { ... } e ANTES do bloco primeiroLogin
# Ancora: a linha após o fechamento da tela de login
OLD_AFTER_LOGIN = '''        <Toast {...toast} />
      </div>
    );
  }'''

NEW_AFTER_LOGIN = '''        <Toast {...toast} />
      </div>
    );
  }

  // ── Seletor de Base Operacional ───────────────────────────────
  if (authed && !baseAtual && basesPermitidas.length > 1) {
    return (
      <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`@keyframes loginFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes loginPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}*{box-sizing:border-box}`}</style>
        <div style={{position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",width:"500px",height:"260px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.06)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

        {/* Logotipo */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28,animation:"loginPop .45s ease-out",position:"relative",zIndex:1}}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{marginBottom:14}}>
            <rect width="56" height="56" rx="14" fill={t.card} stroke={hexRgb(t.ouro,.25)} strokeWidth="1"/>
            <rect x="10" y="15" width="26" height="20" rx="3" fill={hexRgb(t.ouro,.06)} stroke={t.ouro} strokeWidth="1.5" opacity=".45"/>
            <rect x="20" y="21" width="26" height="20" rx="3" fill={hexRgb(t.ouro,.15)} stroke={t.ouro} strokeWidth="2"/>
            <circle cx="33" cy="31" r="3" fill={t.ouro}/>
          </svg>
          <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
          <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
          <div style={{fontSize:9,color:t.txt2,letterSpacing:".12em",textTransform:"uppercase"}}>Controle Operacional</div>
        </div>

        {/* Card seletor */}
        <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"28px 28px 24px",display:"flex",flexDirection:"column",gap:12,animation:"loginFadeUp .4s ease-out",position:"relative",zIndex:1}}>
          <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,letterSpacing:"-.02em",color:t.txt,marginBottom:4}}>Selecione a base de operação</div>
          <div style={{fontSize:12,color:t.txt2,marginBottom:8,lineHeight:1.5}}>Você tem acesso a múltiplas bases. Escolha com qual deseja trabalhar agora.</div>
          {basesPermitidas.map(base => (
            <button
              key={base.id}
              onClick={() => setBaseAtual(base)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:14,background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro,.55);e.currentTarget.style.background=t.bgAlt||t.card2}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.background=t.card2}}
            >
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${hexRgb(t.ouro,.18)},${hexRgb(t.ouro,.08)})`,border:`1px solid ${hexRgb(t.ouro,.3)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-heading)",fontSize:14,fontWeight:700,color:t.txt,letterSpacing:"-.01em"}}>{base.label}</div>
                <div style={{fontSize:10,color:t.txt2,marginTop:2,fontFamily:"var(--font-mono)",letterSpacing:".04em"}}>{base.table}</div>
              </div>
            </button>
          ))}
          <button onClick={handleLogout} style={{marginTop:4,background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
            Sair e trocar conta
          </button>
        </div>
        <Toast {...toast} />
      </div>
    );
  }'''

assert OLD_AFTER_LOGIN in content, "ERRO: âncora após tela de login não encontrada"
content = content.replace(OLD_AFTER_LOGIN, NEW_AFTER_LOGIN, 1)
print("OK: seletor de base adicionado ao render")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_05 COMPLETO")
```

- [ ] **Step 2: Executar**

```powershell
python scripts\patch_05_picker_logout.py
```
Esperado: 2 linhas "OK:" + "patch_05 COMPLETO".

- [ ] **Step 3: Build de verificação**

```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error|warning" | Select-Object -First 20
```
Esperado: nenhum erro (warnings de lint são aceitáveis).

- [ ] **Step 4: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: add base picker UI + clear base on logout"
```

---

## Task 6: Badge de base ativa na topbar

**Files:**
- Modify: `src/App.jsx` (via Python) — topbar desktop

Mostra um badge discreto `● Maracanã` na topbar quando a base ativa não é a padrão, para deixar claro ao usuário onde está operando.

- [ ] **Step 1: Criar script patch_06_badge.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Insere badge após o status de conexão na topbar desktop
OLD_BADGE = '''              <span className={`co-status-badge co-status-badge--${connStatus}`}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>'''

NEW_BADGE = '''              <span className={`co-status-badge co-status-badge--${connStatus}`}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>
              {baseAtual && (
                <span style={{fontSize:9,fontFamily:"var(--font-mono)",color:t.ouro,letterSpacing:".08em",textTransform:"uppercase",padding:"3px 7px",borderRadius:4,background:`${hexRgb(t.ouro,.08)}`,border:`1px solid ${hexRgb(t.ouro,.2)}`}}>
                  ● {baseAtual.label}
                </span>
              )}'''

assert OLD_BADGE in content, "ERRO: âncora do badge não encontrada"
content = content.replace(OLD_BADGE, NEW_BADGE, 1)
print("OK: badge de base na topbar")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_06 COMPLETO")
```

- [ ] **Step 2: Executar**

```powershell
python scripts\patch_06_badge.py
```

- [ ] **Step 3: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: show active base badge in topbar"
```

---

## Task 7: Passar baseAtual ao AdminView + atualizar chave de sync

**Files:**
- Modify: `src/App.jsx` (via Python) — ctx do AdminView
- Modify: `src/views/AdminView.jsx` (Edit tool) — chave gsheet_sync_status + UI bases_permitidas

### 7a — Adicionar baseAtual + BASES ao ctx do AdminView

- [ ] **Step 1: Criar script patch_07_ctx.py**

```python
path = r'src\App.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Adicionar baseAtual e BASES ao ctx que já existe
OLD_CTX = '''          getConexao, supaFetch,
          connStatus,'''

NEW_CTX = '''          getConexao, supaFetch,
          connStatus,
          baseAtual, BASES,'''

assert OLD_CTX in content, "ERRO: âncora ctx AdminView não encontrada"
content = content.replace(OLD_CTX, NEW_CTX, 1)
print("OK: ctx AdminView atualizado")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("patch_07 COMPLETO")
```

- [ ] **Step 2: Executar**

```powershell
python scripts\patch_07_ctx.py
```

- [ ] **Step 3: Commit**

```powershell
git add src\App.jsx
git commit -m "feat: pass baseAtual and BASES to AdminView ctx"
```

### 7b — Atualizar chave de sync status em AdminView

- [ ] **Step 4: Editar AdminView.jsx — declarar BASES no import**

Localizar em `src/views/AdminView.jsx` linha 3:
```js
import { TABLE_USUARIOS, PERMS_PADRAO } from '../constants.js';
```
Substituir por:
```js
import { TABLE_USUARIOS, PERMS_PADRAO, BASES as BASES_CONST } from '../constants.js';
```

Usar Edit tool (AdminView.jsx é menor e seguro).

- [ ] **Step 5: Substituir as 3 ocorrências da chave gsheet_sync_status em AdminView.jsx**

Há 3 ocorrências — no `useEffect` de carga inicial, no botão "Atualizar" e no template do Apps Script.

**Ocorrência 1** (carga inicial, linha ~211):
```js
const v=await getConfigRemoto("gsheet_sync_status");
```
→
```js
const _syncKey = `gsheet_sync_status_${ctx.baseAtual?.id || "imperatriz_belem"}`;
const v=await getConfigRemoto(_syncKey);
```

**Ocorrência 2** (botão Atualizar, linha ~226):
```js
const v=await getConfigRemoto("gsheet_sync_status");setSyncStatus(v?JSON.parse(v):null);setSyncStatusLoading(false);
```
→
```js
const v=await getConfigRemoto(`gsheet_sync_status_${ctx.baseAtual?.id || "imperatriz_belem"}`);setSyncStatus(v?JSON.parse(v):null);setSyncStatusLoading(false);
```

**Ocorrência 3** (template Apps Script, linha ~376):
```js
payload:JSON.stringify([{chave:'gsheet_sync_status',
```
Essa linha faz parte do script que o usuário vai colar no Google Sheets. Deve manter a chave dinâmica no comentário do template, mas o próprio script terá `STATUS_KEY` variável. **Não alterar** — a chave do script já está correta conforme o script Maracanã entregue anteriormente.

Usar Edit tool para as ocorrências 1 e 2.

- [ ] **Step 6: Commit**

```powershell
git add src\views\AdminView.jsx
git commit -m "feat: use per-base sync status key in AdminView"
```

---

## Task 8: Adicionar controle de bases_permitidas na UI de usuários do AdminView

**Files:**
- Modify: `src/views/AdminView.jsx` (Edit tool)

Adiciona checkboxes de base abaixo do seletor de perfil na lista de usuários aprovados.

- [ ] **Step 1: Localizar o seletor de perfil existente em AdminView.jsx**

O bloco a modificar está em torno da linha 159–164 (seletor `<select>` de perfil). A âncora é o fechamento do `<select>`:

```jsx
                      </select>
                      <button onClick={()=>{if(confirm(`Revogar acesso de "${u.nome||u.email}"?`))
```

- [ ] **Step 2: Substituir para envolver em column + adicionar checkboxes de base**

Localizar (Edit tool):
```jsx
                      <select value={u.perfil||"visualizador"} onChange={async e=>{
                        const np=e.target.value;const pm={...PERMS_PADRAO[np]||PERMS_PADRAO.visualizador};
                        const nu=[...usuarios];nu[i]={...nu[i],perfil:np,perms:pm};
                        setUsuarios(nu);saveJSON("co_usuarios_local",nu);
                        const conn=getConexao();
                        if(conn)await supaFetch(conn.url,conn.key,"PATCH",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`,{perfil:np,perms:JSON.stringify(pm)}).catch(()=>{});
                        showToast(`✅ ${u.nome||u.email} → ${np}`,"ok");
                      }} style={{background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:6,padding:"4px 8px",fontSize:10,color:t.ouro,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                        <option value="visualizador">Visualizador</option>
                        <option value="operador">Operador</option>
                        <option value="gerente">Gerente</option>
                        <option value="admin">Admin</option>
                      </select>
```

Substituir por (adiciona `<div>` column que contém o select + checkboxes de base):
```jsx
                      <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                        <select value={u.perfil||"visualizador"} onChange={async e=>{
                          const np=e.target.value;const pm={...PERMS_PADRAO[np]||PERMS_PADRAO.visualizador};
                          const nu=[...usuarios];nu[i]={...nu[i],perfil:np,perms:pm};
                          setUsuarios(nu);saveJSON("co_usuarios_local",nu);
                          const conn=getConexao();
                          if(conn)await supaFetch(conn.url,conn.key,"PATCH",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`,{perfil:np,perms:JSON.stringify(pm)}).catch(()=>{});
                          showToast(`✅ ${u.nome||u.email} → ${np}`,"ok");
                        }} style={{background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:6,padding:"4px 8px",fontSize:10,color:t.ouro,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          <option value="visualizador">Visualizador</option>
                          <option value="operador">Operador</option>
                          <option value="gerente">Gerente</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div style={{display:"flex",flexDirection:"column",gap:2}}>
                          {Object.values(ctx.BASES || BASES_CONST).map(base => {
                            const ids = Array.isArray(u.bases_permitidas) ? u.bases_permitidas
                              : (typeof u.bases_permitidas === "string" ? JSON.parse(u.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]);
                            const checked = ids.includes(base.id);
                            return (
                              <label key={base.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:t.txt2,cursor:"pointer",userSelect:"none"}}>
                                <input type="checkbox" checked={checked} onChange={async()=>{
                                  const newIds = checked ? ids.filter(x=>x!==base.id) : [...ids, base.id];
                                  if (!newIds.length) { showToast("⚠️ Ao menos uma base é necessária","warn"); return; }
                                  const nu=[...usuarios]; nu[i]={...nu[i],bases_permitidas:newIds};
                                  setUsuarios(nu); saveJSON("co_usuarios_local",nu);
                                  const conn=getConexao();
                                  if(conn) await supaFetch(conn.url,conn.key,"PATCH",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`,{bases_permitidas:JSON.stringify(newIds)}).catch(()=>{});
                                  showToast(`✅ Bases de ${u.nome||u.email} atualizadas`,"ok");
                                }} style={{accentColor:t.ouro,cursor:"pointer"}} />
                                {base.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
```

- [ ] **Step 3: Build final**

```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```
Esperado: sem erros.

- [ ] **Step 4: Commit final**

```powershell
git add src\views\AdminView.jsx
git commit -m "feat: add bases_permitidas checkboxes in user management"
```

---

## Verificação Manual (pós-deploy)

1. **Login com usuário que tem 1 base** → deve entrar direto, sem seletor
2. **Login com admin** → deve ver seletor com 2 bases; escolher Maracanã → badge aparece na topbar
3. **Topbar** → badge `● Maracanã` visível ao operar nessa base
4. **Admin → Usuários** → checkboxes de base visíveis; marcar Maracanã para um usuário → salva no Supabase
5. **Login com usuário que agora tem 2 bases** → seletor aparece
6. **Logout** → base é limpa do localStorage; próximo login começa do seletor (se múltiplas bases)
7. **Admin → gsheet_sync_status** → deve exibir status correto por base selecionada

---

## Limpeza (após tudo OK)

```powershell
Remove-Item scripts\patch_0*.py
git add scripts\
git commit -m "chore: remove patch scripts"
```
