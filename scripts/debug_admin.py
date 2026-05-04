"""
Debug: captura erros do console ao navegar para Admin.
"""
import json, time, sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

URL = "http://localhost:5174"
SESSAO = {"perfil":"admin","nome":"Yves","email":"y@g.com",
    "perms":{"ver_admin":True,"editar_planilha":True},"ts":int(time.time()*1000)}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    page = ctx.new_page()

    errors = []
    page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"[PAGEERROR] {e}"))

    page.goto(URL, timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    page.reload(timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(2500)

    print("=== ANTES DO CLICK ADMIN ===")
    print(f"  bodyLen: {page.evaluate('() => document.body.textContent.length')}")

    # Captura o HTML do overlay de erro (shadow DOM)
    overlay_html = page.evaluate("""
        () => {
            const overlay = document.querySelector('vite-error-overlay');
            return overlay ? overlay.shadowRoot?.innerHTML?.slice(0, 500) : 'NO OVERLAY';
        }
    """)
    print(f"  Vite overlay: {overlay_html}")

    # Click admin
    r = page.evaluate("""
        () => {
            const el = document.querySelector('.co-sidebar__user');
            if (!el) return 'NOT_FOUND';
            el.click();
            return 'clicked';
        }
    """)
    print(f"\n  Click: {r}")
    page.wait_for_timeout(3000)

    print(f"\n=== APOS CLICK ===")
    print(f"  bodyLen: {page.evaluate('() => document.body.textContent.length')}")

    # Checa overlay de erro
    overlay_html2 = page.evaluate("""
        () => {
            const overlay = document.querySelector('vite-error-overlay');
            if (!overlay) return 'NO OVERLAY';
            const sr = overlay.shadowRoot;
            if (!sr) return 'NO SHADOW ROOT';
            const msg = sr.querySelector('.message');
            const file = sr.querySelector('.file');
            const frame = sr.querySelector('.frame');
            return JSON.stringify({
                message: msg?.textContent?.slice(0,300),
                file: file?.textContent?.slice(0,100),
                frame: frame?.textContent?.slice(0,200)
            });
        }
    """)
    print(f"  Vite overlay: {overlay_html2}")

    # Mostra erros capturados
    print(f"\n=== ERROS CONSOLE ({len(errors)}) ===")
    for e in errors[-20:]:
        print(f"  {e[:200]}")

    browser.close()
