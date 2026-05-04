"""
Verifica se modal detalhe abriu e melhora captura.
"""
import json, time, sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright
import os

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
URL = "http://localhost:5174"
SESSAO = {"perfil":"admin","nome":"Yves Feitosa Gomes","email":"yvesfg@gmail.com",
    "perms":{"ver_planilha":True,"editar_planilha":True,"ver_admin":True},
    "ts":int(time.time()*1000)}

def shot(page, nome):
    path = os.path.join(OUT, nome)
    page.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"  [{nome}] {size:,} bytes")
    return size

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width":1440, "height":900})
    page = ctx.new_page()
    page.goto(URL, timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.evaluate(f"() => localStorage.setItem('co_sessao', JSON.stringify({json.dumps(SESSAO)}))")
    page.reload(timeout=20000, wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Navega para Planilha
    r = page.evaluate("""
        () => {
            const btn = Array.from(document.querySelectorAll('.co-sidebar__item'))
                .find(b => b.textContent.includes('Planilha'));
            if (!btn) return 'NOT_FOUND';
            btn.click();
            return 'OK';
        }
    """)
    page.wait_for_timeout(1200)

    # Lista as linhas disponíveis
    linhas = page.evaluate("""
        () => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows
                .filter(r => r.textContent.trim().length > 20)
                .slice(0, 10)
                .map(r => r.textContent.trim().slice(0, 60));
        }
    """)
    print(f"Linhas encontradas: {linhas}")

    # Clica na primeira linha de dados (não o header)
    result = page.evaluate("""
        () => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            const dataRow = rows.find(r => r.textContent.trim().length > 10);
            if (!dataRow) return 'NOT_FOUND tbody';
            dataRow.click();
            return 'OK: ' + dataRow.textContent.trim().slice(0, 50);
        }
    """)
    print(f"Click tbody tr: {result}")
    page.wait_for_timeout(1000)

    # Verifica se modal abriu
    body = page.inner_text("body")[:500].replace("\n", " ")
    print(f"Body apos click: {body[:150]}")

    shot(page, "09_modal_detalhe.png")

    # Se modal abriu, tenta abrir OcorrModal dentro dele
    modal_keywords = ["IDENTIFICAÇÃO", "MOTORISTA", "CTE", "MDF", "PLACA", "Ocorrências", "Acompanhamento"]
    modal_aberto = any(kw in body for kw in modal_keywords)
    print(f"Modal detalhe aberto? {modal_aberto}")

    if modal_aberto:
        # Abre OcorrModal a partir do detalhe
        r3 = page.evaluate("""
            () => {
                const btns = Array.from(document.querySelectorAll('button'))
                    .filter(b => b.offsetParent !== null);
                const btn = btns.find(b =>
                    b.textContent.toLowerCase().includes('ocorr') ||
                    b.style.borderStyle === 'dashed'
                );
                if (!btn) {
                    return 'NOT_FOUND. Btns visiveis: ' + btns.slice(0,10).map(b=>b.textContent.trim().slice(0,20)).join(' | ');
                }
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0,40);
            }
        """)
        print(f"  Btn ocorr in detalhe: {r3}")
        page.wait_for_timeout(700)
        shot(page, "10_ocorr_modal_from_detalhe.png")

    ctx.close()
    browser.close()
