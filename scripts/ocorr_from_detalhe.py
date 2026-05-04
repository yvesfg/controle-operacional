"""
Captura OcorrModal a partir do ModalDetalhe.
"""
import json, time, sys, os
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
URL = "http://localhost:5174"
SESSAO = {"perfil":"admin","nome":"Yves Feitosa Gomes","email":"yvesfg@gmail.com",
    "perms":{"ver_planilha":True,"editar_planilha":True,"ver_admin":True,"ver_dashboard":True},
    "ts":int(time.time()*1000)}

def shot(page, nome, desc=""):
    path = os.path.join(OUT, nome)
    page.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"  [{nome}] {size:,} bytes  {desc}")
    return size

def js(page, s):
    try:
        return page.evaluate(s)
    except Exception as e:
        return f"ERR:{e}"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width":1440, "height":900})
    p = ctx.new_page()
    p.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(500)
    p.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    p.reload(timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(3500)

    # Nav Dashboard
    p.evaluate("() => Array.from(document.querySelectorAll('.co-sidebar__item')).find(b=>b.textContent.includes('Dashboard'))?.click()")
    p.wait_for_timeout(2000)

    # Click row (height:40, cursor:pointer)
    r = js(p, """
        () => {
            const all = Array.from(document.querySelectorAll('div'));
            const rows = all.filter(el =>
                el.style.height === '40px' &&
                window.getComputedStyle(el).cursor === 'pointer' &&
                el.textContent.trim().length > 5
            );
            if (rows.length === 0) return 'NOT_FOUND';
            rows[0].click();
            return 'OK: ' + rows[0].textContent.trim().slice(0, 50);
        }
    """)
    print(f"Dashboard row: {r}")
    p.wait_for_timeout(1500)

    # Lista todos os botoes visiveis para entender o que o modal mostra
    btns = js(p, """
        () => Array.from(document.querySelectorAll('button'))
            .filter(b => b.offsetParent !== null)
            .map(b => b.textContent.trim().slice(0, 30))
    """)
    print(f"Botoes visiveis: {[b for b in btns if b][:25]}")

    shot(p, "09_modal_detalhe.png", "modal detalhe confirmado")

    # Procura botao de nova ocorrencia
    r2 = js(p, """
        () => {
            const btns = Array.from(document.querySelectorAll('button'))
                .filter(b => b.offsetParent !== null);
            // Procura "Nova Ocorrência" ou botão com texto de ocorrência
            const btn = btns.find(b =>
                b.textContent.toLowerCase().includes('nova ocorr') ||
                (b.textContent.toLowerCase().includes('ocorr') &&
                 b.textContent.length < 30)
            );
            if (!btn) {
                return 'NOT_FOUND. Btns: ' + btns.map(b=>b.textContent.trim().slice(0,25)).join(' | ');
            }
            btn.click();
            return 'OK: ' + btn.textContent.trim().slice(0,40);
        }
    """)
    print(f"Btn ocorr: {r2}")
    p.wait_for_timeout(800)

    if "OK:" in str(r2):
        shot(p, "10_ocorr_modal_from_detalhe.png", "ocorr modal dentro do detalhe")

    ctx.close()
    browser.close()
