"""
Captura screenshots — v6. Corrige OcorrModal, ModalDetalhe, Admin, ConfigDB.
"""

import json, time, os, sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:5174"

SESSAO_ADMIN = {
    "perfil": "admin", "nome": "Yves Feitosa Gomes", "email": "yvesfg@gmail.com",
    "perms": {"ver_planilha":True,"editar_planilha":True,"ver_motoristas":True,
              "editar_motoristas":True,"ver_diarias":True,"editar_diarias":True,
              "ver_ocorrencias":True,"editar_ocorrencias":True,"ver_descarga":True,
              "editar_descarga":True,"ver_admin":True},
    "ts": int(time.time() * 1000)
}

def shot(page, nome, desc=""):
    path = os.path.join(OUT, nome)
    page.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"  [{nome}] {size:,} bytes  {desc}")
    return size

def js(page, script):
    try:
        return page.evaluate(script)
    except Exception as e:
        return f"ERR: {e}"

def click_btn_exact(page, *texts):
    """Clica no botao cujo texto contem exatamente um dos textos dados (case-insensitive)."""
    for txt in texts:
        r = js(page, f"""
            () => {{
                const t = {json.dumps(txt.lower())};
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.textContent.toLowerCase().includes(t));
                if (!btn) return null;
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0, 60);
            }}
        """)
        if r and "OK:" in str(r):
            return r
    return f"NOT_FOUND: {texts}"

def nav_tab(page, frag):
    r = js(page, f"""
        () => {{
            const f = {json.dumps(frag.lower())};
            const btn = Array.from(document.querySelectorAll('.co-sidebar__item'))
                .find(b => b.textContent.toLowerCase().includes(f));
            if (!btn) return 'NOT_FOUND';
            btn.click();
            return 'OK: ' + btn.textContent.trim().slice(0, 30);
        }}
    """)
    page.wait_for_timeout(1200)
    return r

def new_page(browser, sessao=None):
    if sessao is None: sessao = SESSAO_ADMIN
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    p = ctx.new_page()
    p.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(500)
    p.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(sessao)}))")
    p.reload(timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(2500)  # Espera Supabase carregar
    return ctx, p

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])

        # ─── OcorrModal (via OcorrenciasView — botao "Nova Ocorrência") ───
        print("=== OCORR MODAL ===")
        ctx, page = new_page(browser)
        nav_tab(page, "ocorr")

        btns = js(page, "() => Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,40))")
        print(f"  Btns: {[b for b in btns if b][:15]}")

        # Clica "Nova Ocorrência" especificamente (nao "Nova DT")
        r = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.textContent.trim() === 'Nova Ocorrência'
                                       || b.textContent.includes('Nova Ocorrência'));
                if (!btn) {
                    // Tenta qualquer botao que contenha "ocorr" mas nao "alerta"
                    const btn2 = btns.find(b =>
                        b.textContent.toLowerCase().includes('ocorr') &&
                        !b.textContent.toLowerCase().includes('alerta')
                    );
                    if (!btn2) return 'NOT_FOUND';
                    btn2.click();
                    return 'OK (fallback): ' + btn2.textContent.trim().slice(0,40);
                }
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0,40);
            }
        """)
        print(f"  Nova Ocorrência: {r}")
        page.wait_for_timeout(800)
        shot(page, "10_ocorr_modal.png", "ocorr modal unificado")
        ctx.close()

        # ─── ModalDetalhe (clica linha real do Dashboard) ────────────────
        print("\n=== MODAL DETALHE ===")
        ctx, page = new_page(browser)
        nav_tab(page, "dashboard")

        # Verifica o que tem no dashboard
        body_dash = page.inner_text("body")[:400].replace("\n"," ")
        print(f"  Dashboard body: {body_dash[:150]}")

        # Clica no primeiro elemento clicável com dados reais
        r = js(page, """
            () => {
                // Busca rows clicáveis no dashboard (linhas de viagem)
                const rows = Array.from(document.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]'));
                // Filtra: tem texto suficiente, não é botão, não é nav
                const viagens = rows.filter(el =>
                    el.tagName !== 'BUTTON' &&
                    !el.classList.contains('co-sidebar__item') &&
                    !el.classList.contains('co-sidebar__user') &&
                    el.textContent.trim().length > 5
                );
                if (viagens.length === 0) return 'NO_ROWS';
                viagens[0].click();
                return 'OK: ' + viagens[0].textContent.trim().slice(0, 60);
            }
        """)
        print(f"  Click row: {r}")
        page.wait_for_timeout(1000)

        body_after = page.inner_text("body")[:400].replace("\n"," ")
        modal_ok = len(body_after) > 500 and body_after != body_dash[:400]
        print(f"  Modal aberto? {modal_ok}  body: {body_after[:100]}")

        if not modal_ok:
            # Tenta na Planilha — clica na primeira linha visível
            nav_tab(page, "planilha")
            r2 = js(page, """
                () => {
                    const rows = Array.from(document.querySelectorAll('tr[style*="cursor"], tr[onclick], tbody tr'));
                    const row = rows.find(r => r.textContent.trim().length > 10);
                    if (!row) {
                        // Tenta divs com cursor pointer que não são nav
                        const divs = Array.from(document.querySelectorAll('div[style*="cursor: pointer"]'));
                        const div = divs.find(d =>
                            !d.classList.contains('co-sidebar__item') &&
                            !d.classList.contains('co-sidebar__user') &&
                            d.textContent.trim().length > 5
                        );
                        if (div) { div.click(); return 'OK div: ' + div.textContent.trim().slice(0,40); }
                        return 'NOT_FOUND';
                    }
                    row.click();
                    return 'OK tr: ' + row.textContent.trim().slice(0,40);
                }
            """)
            print(f"  Planilha row: {r2}")
            page.wait_for_timeout(1000)

        shot(page, "09_modal_detalhe.png", "modal detalhe")

        # ─── OcorrModal from ModalDetalhe (se abriu) ─────────────────────
        body_det = page.inner_text("body")[:300].replace("\n"," ")
        detalhe_aberto = modal_ok
        print(f"\n=== OCORR FROM DETALHE ===")
        print(f"  Detalhe status: {detalhe_aberto}")
        if detalhe_aberto:
            btns_in_modal = js(page, """
                () => Array.from(document.querySelectorAll('button'))
                    .filter(b => b.offsetParent !== null)
                    .map(b => b.textContent.trim().slice(0, 30))
            """)
            print(f"  Btns no modal: {btns_in_modal[:20]}")

            r3 = js(page, """
                () => {
                    const btns = Array.from(document.querySelectorAll('button'))
                        .filter(b => b.offsetParent !== null);
                    const btn = btns.find(b =>
                        b.textContent.includes('Ocorrência') ||
                        b.textContent.includes('ocorrência') ||
                        b.textContent.includes('Ocorr')
                    );
                    if (!btn) return 'NOT_FOUND';
                    btn.click();
                    return 'OK: ' + btn.textContent.trim().slice(0,40);
                }
            """)
            print(f"  Btn ocorr in detalhe: {r3}")
            if "OK" in str(r3):
                page.wait_for_timeout(700)
                shot(page, "10_ocorr_modal_from_detalhe.png", "ocorr modal (from detalhe)")

        ctx.close()

        # ─── Admin View ───────────────────────────────────────────────────
        print("\n=== ADMIN VIEW ===")
        ctx, page = new_page(browser)
        body_init = page.inner_text("body")[:100].replace("\n"," ")
        print(f"  Init: {body_init}")

        # Método alternativo: procurar React fiber e setar activeTab diretamente
        # Primeiro tenta clique normal
        r = js(page, """
            () => {
                const el = document.querySelector('.co-sidebar__user');
                if (!el) return 'NOT_FOUND';
                el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                return 'clicked';
            }
        """)
        print(f"  Click (dispatchEvent): {r}")
        page.wait_for_timeout(3000)  # Espera mais

        body_after = page.inner_text("body")[:200].replace("\n"," ")
        print(f"  Body apos click (3s): {body_after[:100]}")

        # Verifica se há erros no console
        errors = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('button'))
                    .map(b => b.textContent.trim().slice(0, 30));
                const h1 = Array.from(document.querySelectorAll('h1,h2,h3'))
                    .map(h => h.textContent.trim().slice(0, 30));
                return {btns: btns.slice(0,10), h1, bodyLen: document.body.textContent.length};
            }
        """)
        print(f"  Debug: {errors}")

        shot(page, "08_admin.png", "view admin")

        # ─── ConfigDB modal (admin view) ──────────────────────────────────
        print("\n=== CONFIG DB MODAL ===")
        body_admin = page.inner_text("body")[:200].replace("\n"," ")
        print(f"  Admin body: {body_admin[:100]}")

        btns_admin = js(page, """
            () => Array.from(document.querySelectorAll('button'))
                .map(b => b.textContent.trim().slice(0, 30))
        """)
        print(f"  Todos btns: {[b for b in btns_admin if b][:20]}")

        r = js(page, """
            () => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b =>
                    b.textContent.toLowerCase().includes('config') ||
                    b.textContent.toLowerCase().includes('db') ||
                    b.textContent.toLowerCase().includes('banco')
                );
                if (!btn) return 'NOT_FOUND. Total: ' + btns.length;
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0, 40);
            }
        """)
        print(f"  Config DB: {r}")
        page.wait_for_timeout(800)
        shot(page, "13_modal_configdb.png", "modal config db")
        ctx.close()

        browser.close()

    # Sumário
    print("\n=== SUMÁRIO FINAL ===")
    all_files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    for f in all_files:
        size = os.path.getsize(os.path.join(OUT, f))
        ok = "✅" if size > 20000 else "⚠️ "
        print(f"  {ok}  {f}  {size:,} bytes")

if __name__ == "__main__":
    main()
