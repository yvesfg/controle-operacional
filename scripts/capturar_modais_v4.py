"""
Captura screenshots de todos os modais — v4.
Usa JS click direto para evitar problemas de intercept.
Textos de botoes corrigidos.
"""

import json, time, os, sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:5174"

# ── Sessoes ──────────────────────────────────────────────────────────────
SESSAO_ADMIN = {
    "perfil": "admin",
    "nome":   "Yves Feitosa Gomes",
    "email":  "yvesfg@gmail.com",
    "perms":  {"ver_planilha":True,"editar_planilha":True,"ver_motoristas":True,
               "editar_motoristas":True,"ver_diarias":True,"editar_diarias":True,
               "ver_ocorrencias":True,"editar_ocorrencias":True,"ver_descarga":True,
               "editar_descarga":True,"ver_admin":True},
    "ts": int(time.time() * 1000)
}

SESSAO_OPERADOR = {
    "perfil": "operador",
    "nome":   "Carlos Operador",
    "email":  "operador@yfgroup.com",
    "perms":  {"ver_planilha":True,"editar_planilha":True,"ver_motoristas":True,
               "editar_motoristas":True,"ver_diarias":True,"editar_diarias":True,
               "ver_ocorrencias":True},
    "ts": int(time.time() * 1000)
}

# Registro de amostra injetado em dados_extras para abrir ModalDetalhe
DADOS_EXTRAS = [
    {
        "dt": "DT-0001",
        "nome": "João da Silva",
        "cpf": "123.456.789-00",
        "placa": "ABC1D23",
        "origem": "São Paulo - SP",
        "destino": "Rio de Janeiro - RJ",
        "status": "CARREGADO",
        "cte": "CTE-99999",
        "nf": "NF001,NF002",
        "mdf": "MDF-001",
        "mat": "MAT-001",
        "vl_cte": "5000",
        "vl_contrato": "3500",
        "adiant": "500",
        "data_agenda": "2026-05-04",
        "obs": "Registro de teste"
    }
]

# ── Helpers ──────────────────────────────────────────────────────────────

def shot(page, nome, descricao=""):
    path = os.path.join(OUT, nome)
    page.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"  [{nome}] {size:,} bytes  {descricao}")
    return path

def js(page, script):
    """Executa JS e retorna resultado."""
    try:
        return page.evaluate(script)
    except Exception as e:
        return f"ERROR: {e}"

def js_click(page, selector, timeout=3000):
    """Clica via JS .click() — evita problemas de pointer-events intercept."""
    result = js(page, f"""
        () => {{
            const el = document.querySelector('{selector}');
            if (!el) return 'NOT_FOUND';
            el.click();
            return 'OK: ' + el.tagName + ' ' + (el.textContent || '').trim().slice(0, 50);
        }}
    """)
    return result

def click_btn_with_text(page, *texts):
    """Tenta clicar em botao com um dos textos dados via JS."""
    for txt in texts:
        result = js(page, f"""
            () => {{
                const txt = {json.dumps(txt)}.toLowerCase();
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.textContent.toLowerCase().includes(txt));
                if (!btn) return 'NOT_FOUND: ' + {json.dumps(txt)};
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0, 60);
            }}
        """)
        if result and result.startswith("OK"):
            return result
    return f"NOT_FOUND: {texts}"

def navegar_tab(page, label_fragment):
    """Navega para a aba clicando no botao da sidebar."""
    result = js(page, f"""
        () => {{
            const frag = {json.dumps(label_fragment.lower())};
            const btns = Array.from(document.querySelectorAll('.co-sidebar__item'));
            const btn = btns.find(b => b.textContent.toLowerCase().includes(frag));
            if (!btn) return 'NOT_FOUND: ' + frag;
            btn.click();
            return 'OK: ' + btn.textContent.trim().slice(0, 40);
        }}
    """)
    page.wait_for_timeout(700)
    return result

def setup(browser, sessao):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(URL, timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(400)
    page.evaluate(f"""
        () => {{
            localStorage.setItem('co_sessao', JSON.stringify({json.dumps(sessao)}));
            localStorage.setItem('dados_extras', JSON.stringify({json.dumps(DADOS_EXTRAS)}));
        }}
    """)
    page.reload(timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    return ctx, page

# ── Main ──────────────────────────────────────────────────────────────────

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])

        # ═══════════════════════════════════════════════
        # SESSAO ADMIN
        # ═══════════════════════════════════════════════
        print("=== INICIANDO (admin) ===")
        ctx, page = setup(browser, SESSAO_ADMIN)
        body = page.inner_text("body")[:80].replace("\n"," ")
        print(f"  Body: {body}")

        # Listar todos os tabs disponiveis
        tabs_info = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('.co-sidebar__item'));
                return btns.map(b => b.textContent.trim().slice(0,20));
            }
        """)
        print(f"  Tabs: {tabs_info}")

        # ── 01 Dashboard ──────────────────────────────
        print("\n── 01 DASHBOARD")
        r = navegar_tab(page, "dashboard")
        print(f"  Nav: {r}")
        shot(page, "01_dashboard.png", "view dashboard")

        # ── 02 Planilha ───────────────────────────────
        print("\n── 02 PLANILHA")
        r = navegar_tab(page, "planilha")
        print(f"  Nav: {r}")
        shot(page, "02_planilha.png", "view planilha")

        # ── 03 Operacional ────────────────────────────
        print("\n── 03 OPERACIONAL")
        r = navegar_tab(page, "operac")
        print(f"  Nav: {r}")
        shot(page, "03_operacional.png", "view operacional")

        # ── 04 Motoristas ─────────────────────────────
        print("\n── 04 MOTORISTAS")
        r = navegar_tab(page, "motori")
        print(f"  Nav: {r}")
        shot(page, "04_motoristas.png", "view motoristas")

        # ── 05 Diárias ────────────────────────────────
        print("\n── 05 DIÁRIAS")
        r = navegar_tab(page, "diárias")
        if "NOT_FOUND" in str(r):
            r = navegar_tab(page, "di")
        print(f"  Nav: {r}")
        shot(page, "05_diarias.png", "view diarias")

        # ── 06 Carga/Descarga ─────────────────────────
        print("\n── 06 DESCARGA")
        r = navegar_tab(page, "carga")
        print(f"  Nav: {r}")
        shot(page, "06_descarga.png", "view carga-descarga")

        # ── 07 Ocorrências ────────────────────────────
        print("\n── 07 OCORRÊNCIAS")
        r = navegar_tab(page, "ocorr")
        print(f"  Nav: {r}")
        shot(page, "07_ocorrencias.png", "view ocorrencias")

        # ── 08 Admin (via user avatar) ────────────────
        print("\n── 08 ADMIN")
        r = js(page, """
            () => {
                const el = document.querySelector('.co-sidebar__user');
                if (!el) return 'NOT_FOUND';
                el.click();
                return 'OK';
            }
        """)
        page.wait_for_timeout(800)
        print(f"  Admin click: {r}")
        shot(page, "08_admin.png", "view admin")

        # ─────────────────────────────────────────────
        # MODAL EDIT (Nova DT) — via topbar da planilha
        # ─────────────────────────────────────────────
        print("\n── MODAL EDIT")
        r = navegar_tab(page, "planilha")
        page.wait_for_timeout(600)

        # Botao "Nova DT" no topbar
        r2 = click_btn_with_text(page, "nova dt", "nova DT", "NOVA DT")
        print(f"  Btn Nova DT: {r2}")
        page.wait_for_timeout(700)
        body_m = page.inner_text("body")[:200].replace("\n"," ")
        print(f"  Body apos click: {body_m[:100]}")
        shot(page, "08_modal_edit.png", "modal nova dt / edit")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

        # ─────────────────────────────────────────────
        # MODAL DETALHE — clica em linha da Planilha
        # ─────────────────────────────────────────────
        print("\n── MODAL DETALHE")
        # Dados extras ja injetados. Navega para planilha e tenta clicar na linha
        r = navegar_tab(page, "planilha")
        page.wait_for_timeout(800)

        # Lista o texto da pagina para ver se DT-0001 aparece
        body_plan = page.inner_text("body")[:500].replace("\n"," ")
        print(f"  Planilha body: {body_plan[:150]}")

        # Tenta clicar na linha com DT-0001 ou Joao da Silva
        r3 = js(page, """
            () => {
                const all = Array.from(document.querySelectorAll('tr, [style*="cursor: pointer"], [style*="cursor:pointer"]'));
                const row = all.find(el => el.textContent.includes('DT-0001') || el.textContent.includes('João da Silva'));
                if (!row) {
                    // Lista o que tem cursor pointer
                    const ptrs = Array.from(document.querySelectorAll('*')).filter(el => {
                        const s = window.getComputedStyle(el).cursor;
                        return s === 'pointer' && el.children.length < 10 && el.textContent.trim().length > 2;
                    });
                    return 'NOT_FOUND. Pointer els: ' + ptrs.slice(0,5).map(e=>e.textContent.trim().slice(0,30)).join(' | ');
                }
                row.click();
                return 'OK: ' + row.tagName + ' ' + row.textContent.trim().slice(0,60);
            }
        """)
        print(f"  Row click: {r3}")
        page.wait_for_timeout(800)

        body_det = page.inner_text("body")[:400].replace("\n"," ")
        modal_aberto = "DT-0001" in body_det or "João da Silva" in body_det or "detalhe" in body_det.lower()
        print(f"  Modal detalhe aberto? {modal_aberto}. Body: {body_det[:100]}")

        if not modal_aberto:
            # Tenta no Dashboard
            r = navegar_tab(page, "dashboard")
            page.wait_for_timeout(800)
            body_dash = page.inner_text("body")[:500].replace("\n"," ")
            print(f"  Dashboard body: {body_dash[:150]}")

            r4 = js(page, """
                () => {
                    const all = Array.from(document.querySelectorAll('*'));
                    const row = all.find(el =>
                        (el.textContent.includes('DT-0001') || el.textContent.includes('João da Silva'))
                        && el.children.length < 8
                    );
                    if (!row) return 'NOT_FOUND';
                    row.click();
                    return 'OK: ' + row.tagName + ' ' + row.textContent.trim().slice(0,60);
                }
            """)
            print(f"  Dashboard row click: {r4}")
            page.wait_for_timeout(800)

        shot(page, "09_modal_detalhe.png", "modal detalhe")
        detalhe_ok = modal_aberto

        # ─────────────────────────────────────────────
        # OCORR MODAL — de dentro do ModalDetalhe
        # ─────────────────────────────────────────────
        print("\n── OCORR MODAL")
        if detalhe_ok:
            # Procura botao de nova ocorrencia dentro do modal detalhe
            r5 = js(page, """
                () => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const btn = btns.find(b =>
                        b.textContent.toLowerCase().includes('ocorr') ||
                        b.textContent.toLowerCase().includes('nova ocorr') ||
                        (b.style && b.style.borderStyle === 'dashed')
                    );
                    if (!btn) {
                        // Mostra todos os botoes visiveis
                        const vis = btns.filter(b => b.offsetParent !== null).slice(0, 15);
                        return 'NOT_FOUND. Buttons: ' + vis.map(b=>b.textContent.trim().slice(0,20)).join(' | ');
                    }
                    btn.click();
                    return 'OK: ' + btn.textContent.trim().slice(0,40);
                }
            """)
            print(f"  Btn ocorr: {r5}")
            page.wait_for_timeout(700)
            shot(page, "10_ocorr_modal.png", "ocorr modal (de dentro do detalhe)")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        else:
            # Tenta abrir OcorrModal diretamente da view de Ocorrencias
            r = navegar_tab(page, "ocorr")
            page.wait_for_timeout(700)
            r5 = click_btn_with_text(page, "nova ocorr", "ocorrência", "Nova", "＋")
            print(f"  Ocorr btn (via view): {r5}")
            page.wait_for_timeout(600)
            shot(page, "10_ocorr_modal.png", "ocorr modal (via view ocorrencias)")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

        # ─────────────────────────────────────────────
        # MODAL MOTORISTA — na view Motoristas
        # ─────────────────────────────────────────────
        print("\n── MODAL MOTORISTA")
        r = navegar_tab(page, "motori")
        page.wait_for_timeout(800)

        # Lista todos os botoes visiveis
        btns_info = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
                return btns.map(b => b.textContent.trim().slice(0, 30));
            }
        """)
        print(f"  Botoes: {btns_info[:15]}")

        r6 = click_btn_with_text(page, "novo", "＋ NOVO", "+ NOVO", "adicionar", "cadastrar")
        print(f"  Btn NOVO motorista: {r6}")
        page.wait_for_timeout(800)
        shot(page, "11_modal_motorista.png", "modal novo motorista")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

        # ─────────────────────────────────────────────
        # MODAL CONFIG DB — na view Admin
        # ─────────────────────────────────────────────
        print("\n── MODAL CONFIG DB")
        r = js(page, """
            () => {
                const el = document.querySelector('.co-sidebar__user');
                if (!el) return 'NOT_FOUND';
                el.click();
                return 'OK';
            }
        """)
        page.wait_for_timeout(800)
        print(f"  Navegou Admin: {r}")

        btns_admin = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
                return btns.map(b => b.textContent.trim().slice(0, 30));
            }
        """)
        print(f"  Botoes admin: {btns_admin[:20]}")

        r7 = click_btn_with_text(page, "config db", "config", "configurar", "banco de dados")
        print(f"  Btn Config DB: {r7}")
        page.wait_for_timeout(800)
        shot(page, "13_modal_configdb.png", "modal configurar banco de dados")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

        ctx.close()

        # ═══════════════════════════════════════════════
        # SESSAO OPERADOR — para capturar ModalUsuario
        # ═══════════════════════════════════════════════
        print("\n=== SESSAO OPERADOR (ModalUsuario) ===")
        ctx2, page2 = setup(browser, SESSAO_OPERADOR)
        body2 = page2.inner_text("body")[:100].replace("\n"," ")
        print(f"  Body: {body2}")

        # Para operador, clicar no avatar abre ModalUsuario (nao admin)
        r_usr = js(page2, """
            () => {
                const el = document.querySelector('.co-sidebar__user');
                if (!el) return 'NOT_FOUND';
                el.click();
                return 'OK: ' + el.textContent.trim().slice(0,30);
            }
        """)
        print(f"  Avatar click: {r_usr}")
        page2.wait_for_timeout(800)
        body_usr = page2.inner_text("body")[:300].replace("\n"," ")
        print(f"  Body apos click: {body_usr[:100]}")
        shot(page2, "12_modal_usuario.png", "modal perfil usuario")

        ctx2.close()
        browser.close()

    # ── Sumario ──────────────────────────────────────────────────────────
    print("\n=== SUMÁRIO FINAL ===")
    files = sorted(f for f in os.listdir(OUT) if f.endswith(".png") and not f.startswith("0") is False)
    # todos os png
    all_files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    for f in all_files:
        size = os.path.getsize(os.path.join(OUT, f))
        status = "✅" if size > 20000 else "⚠️  pequeno"
        print(f"  {status}  {f}  {size:,} bytes")

if __name__ == "__main__":
    main()
