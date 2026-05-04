"""
Captura ModalDetalhe (do Dashboard) e planilha inline detalhe.
"""
import json, time, sys, os
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
URL = "http://localhost:5174"
SESSAO = {"perfil":"admin","nome":"Yves Feitosa Gomes","email":"yvesfg@gmail.com",
    "perms":{"ver_planilha":True,"editar_planilha":True,"ver_admin":True,
             "ver_dashboard":True,"ver_motoristas":True},
    "ts":int(time.time()*1000)}

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

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])

    # ─── SESSAO 1: Planilha inline detalhe ─────────────────────────────
    print("=== PLANILHA INLINE DETALHE ===")
    ctx1 = browser.new_context(viewport={"width":1440, "height":900})
    p1 = ctx1.new_page()
    p1.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p1.wait_for_timeout(500)
    p1.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    p1.reload(timeout=20000, wait_until="domcontentloaded")
    p1.wait_for_timeout(3000)

    # Nav planilha
    p1.evaluate("""
        () => Array.from(document.querySelectorAll('.co-sidebar__item'))
            .find(b => b.textContent.includes('Planilha'))?.click()
    """)
    p1.wait_for_timeout(1500)

    # Click na primeira linha real de dados
    r = js(p1, """
        () => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            for (const row of rows) {
                const txt = row.textContent.trim();
                // Linha de dados tem DT numérico (8+ digits)
                if (/\d{8}/.test(txt) && txt.length > 20) {
                    row.click();
                    return 'OK: ' + txt.slice(0, 60);
                }
            }
            // Fallback: primeira tbody row
            const r = document.querySelector('tbody tr');
            if (r) { r.click(); return 'OK fallback: ' + r.textContent.trim().slice(0,60); }
            return 'NOT_FOUND';
        }
    """)
    print(f"  Planilha row click: {r}")
    p1.wait_for_timeout(1200)

    body_p = p1.inner_text("body")[:300].replace("\n"," ")
    print(f"  Body: {body_p[:120]}")
    shot(p1, "09_planilha_detalhe_inline.png", "planilha detalhe inline (sidebar dentro da view)")
    ctx1.close()

    # ─── SESSAO 2: ModalDetalhe (do Dashboard) ─────────────────────────
    print("\n=== MODAL DETALHE (do Dashboard) ===")
    ctx2 = browser.new_context(viewport={"width":1440, "height":900})
    p2 = ctx2.new_page()
    p2.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p2.wait_for_timeout(500)
    p2.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    p2.reload(timeout=20000, wait_until="domcontentloaded")
    p2.wait_for_timeout(3500)  # Mais tempo para carregar dados

    # Nav dashboard
    p2.evaluate("""
        () => Array.from(document.querySelectorAll('.co-sidebar__item'))
            .find(b => b.textContent.includes('Dashboard'))?.click()
    """)
    p2.wait_for_timeout(2000)

    # Lista elementos clicáveis no dashboard com height:40
    rows_info = js(p2, """
        () => {
            const all = Array.from(document.querySelectorAll('div[style*="height: 40px"], div[style*="height:40px"]'));
            const withCursor = all.filter(el =>
                window.getComputedStyle(el).cursor === 'pointer' &&
                el.textContent.trim().length > 5 &&
                !el.classList.contains('co-sidebar__item')
            );
            return withCursor.map(el => el.textContent.trim().slice(0, 50));
        }
    """)
    print(f"  Rows com height:40 e cursor:pointer: {rows_info[:10]}")

    # Tenta clicar numa dessas linhas
    r2 = js(p2, """
        () => {
            // Busca divs com height 40 e cursor pointer (viagens recentes do dashboard)
            const all = Array.from(document.querySelectorAll('div'));
            const rows = all.filter(el => {
                const s = el.style;
                const cs = window.getComputedStyle(el);
                return (s.height === '40px' || s.height === '40') &&
                       cs.cursor === 'pointer' &&
                       el.textContent.trim().length > 5;
            });
            if (rows.length === 0) {
                // Fallback: busca qualquer div clicável com DT pattern
                const dtRows = all.filter(el =>
                    /\d{8}/.test(el.textContent) &&
                    window.getComputedStyle(el).cursor === 'pointer' &&
                    el.children.length <= 5 &&
                    el.tagName !== 'BUTTON'
                );
                if (dtRows.length > 0) {
                    dtRows[0].click();
                    return 'OK (DT pattern): ' + dtRows[0].textContent.trim().slice(0,50);
                }
                return 'NOT_FOUND. Cursor pointer els: ' +
                    all.filter(e => window.getComputedStyle(e).cursor === 'pointer' && e.children.length < 5)
                    .slice(0, 5).map(e => e.textContent.trim().slice(0, 30)).join(' | ');
            }
            rows[0].click();
            return 'OK: ' + rows[0].textContent.trim().slice(0, 50);
        }
    """)
    print(f"  Dashboard row click: {r2}")
    p2.wait_for_timeout(1200)

    body2 = p2.inner_text("body")[:500].replace("\n"," ")
    print(f"  Body: {body2[:150]}")

    # Verifica se ModalDetalhe abriu (overlay)
    modal_check = js(p2, """
        () => {
            // ModalDetalhe é um overlay fixed/absolute com z-index alto
            const modals = Array.from(document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]'));
            return modals.filter(m => m.textContent.trim().length > 50)
                .map(m => m.textContent.trim().slice(0, 80));
        }
    """)
    print(f"  Modal fixos: {modal_check[:5]}")

    shot(p2, "09_modal_detalhe.png", "modal detalhe (do dashboard)")

    # Se o modal abriu, captura OcorrModal de dentro
    if modal_check:
        print("\n  Tentando abrir OcorrModal do ModalDetalhe...")
        r3 = js(p2, """
            () => {
                const btns = Array.from(document.querySelectorAll('button'))
                    .filter(b => b.offsetParent !== null);
                const btn = btns.find(b =>
                    b.textContent.toLowerCase().includes('ocorr') &&
                    !b.textContent.includes('Ocorrências')  // evita nav
                );
                if (!btn) {
                    return 'NOT_FOUND. Btns: ' + btns.slice(0,15).map(b=>b.textContent.trim().slice(0,20)).join(' | ');
                }
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0,40);
            }
        """)
        print(f"  Btn ocorr: {r3}")
        p2.wait_for_timeout(700)
        shot(p2, "10_ocorr_modal_from_detalhe.png", "ocorr modal (from modal detalhe)")

    ctx2.close()
    browser.close()

print("\n=== SUMÁRIO ===")
for f in sorted(os.listdir(OUT)):
    if f.endswith(".png"):
        size = os.path.getsize(os.path.join(OUT, f))
        ok = "✅" if size > 20000 else "⚠️ "
        print(f"  {ok}  {f}  {size:,} bytes")
