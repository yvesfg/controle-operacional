import sys, json, time, os
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
URL = "http://localhost:5174"
SESSAO = {"perfil":"admin","nome":"Yves Feitosa Gomes","email":"yvesfg@gmail.com",
    "perms":{"ver_planilha":True,"editar_planilha":True,"ver_admin":True,"ver_dashboard":True},
    "ts":int(time.time()*1000)}

def js(page, s):
    try: return page.evaluate(s)
    except Exception as e: return f"ERR:{e}"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    p = ctx.new_page()
    p.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(500)
    p.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    p.reload(timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(3000)

    # Navega para Planilha
    p.evaluate("() => Array.from(document.querySelectorAll('.co-sidebar__item')).find(b=>b.textContent.includes('Planilha'))?.click()")
    p.wait_for_timeout(1500)

    # Lista botões visíveis
    btns = js(p, """
        () => Array.from(document.querySelectorAll('button'))
            .filter(b => b.offsetParent !== null)
            .map(b => b.textContent.trim().slice(0, 30))
    """)
    print(f"Botoes: {[b for b in btns if b][:15]}")

    # Clica em "Nova DT" ou "+ Nova" ou "Novo Registro"
    r = js(p, """
        () => {
            const btns = Array.from(document.querySelectorAll('button'))
                .filter(b => b.offsetParent !== null);
            const btn = btns.find(b =>
                b.textContent.includes('Nova DT') ||
                b.textContent.includes('+ Nova') ||
                b.textContent.trim() === 'Novo'
            );
            if (!btn) return 'NOT_FOUND: ' + btns.map(b=>b.textContent.trim().slice(0,20)).join(' | ');
            btn.click();
            return 'OK: ' + btn.textContent.trim();
        }
    """)
    print(f"Btn click: {r}")
    p.wait_for_timeout(1200)

    path = os.path.join(OUT, "08_modal_edit_2col.png")
    p.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"Screenshot salvo: {size:,} bytes")

    ctx.close()
    browser.close()
