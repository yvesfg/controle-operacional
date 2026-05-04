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

    # Dashboard e click na linha
    p.evaluate("() => Array.from(document.querySelectorAll('.co-sidebar__item')).find(b=>b.textContent.includes('Dashboard'))?.click()")
    p.wait_for_timeout(2000)
    js(p, """
        () => {
            const rows = Array.from(document.querySelectorAll('div'))
                .filter(el => el.style.height === '40px' && window.getComputedStyle(el).cursor === 'pointer');
            if (rows[0]) rows[0].click();
        }
    """)
    p.wait_for_timeout(1500)

    # Clica "+ Nova Ocorrência" especificamente
    r = js(p, """
        () => {
            const btns = Array.from(document.querySelectorAll('button'))
                .filter(b => b.offsetParent !== null);
            const btn = btns.find(b => b.textContent.trim() === '+ Nova Ocorrência');
            if (!btn) {
                return 'NOT_FOUND. Btns: ' + btns.map(b=>b.textContent.trim().slice(0,25)).join(' | ');
            }
            btn.click();
            return 'OK: ' + btn.textContent.trim();
        }
    """)
    print(f"+ Nova Ocorrência: {r}")
    p.wait_for_timeout(800)
    shot(p, "10_ocorr_modal_from_detalhe.png", "OcorrModal (do ModalDetalhe)")

    ctx.close()
    browser.close()
