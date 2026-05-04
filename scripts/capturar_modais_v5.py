"""
Captura screenshots de modais — v5.
Um contexto de browser por modal para evitar corrupção de estado React.
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
SESSAO_OPERADOR = {
    "perfil": "operador", "nome": "Carlos Operador", "email": "operador@yfgroup.com",
    "perms": {"ver_planilha":True,"editar_planilha":True,"ver_motoristas":True,
              "editar_motoristas":True,"ver_diarias":True},
    "ts": int(time.time() * 1000)
}
DADOS_EXTRAS = [{"dt":"DT-0001","nome":"João da Silva","cpf":"123.456.789-00",
    "placa":"ABC1D23","origem":"São Paulo - SP","destino":"Rio de Janeiro - RJ",
    "status":"CARREGADO","cte":"CTE-99999","nf":"NF001,NF002","mdf":"MDF-001",
    "mat":"MAT-001","vl_cte":"5000","vl_contrato":"3500","adiant":"500",
    "data_agenda":"2026-05-04","obs":"Registro de teste"}]

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

def click_js(page, selector):
    return js(page, f"""
        () => {{
            const el = document.querySelector('{selector}');
            if (!el) return 'NOT_FOUND: {selector}';
            el.click();
            return 'OK: ' + (el.textContent || '').trim().slice(0, 50);
        }}
    """)

def click_btn_text(page, *texts):
    for txt in texts:
        r = js(page, f"""
            () => {{
                const t = {json.dumps(txt.lower())};
                const btn = Array.from(document.querySelectorAll('button'))
                    .find(b => b.textContent.toLowerCase().includes(t));
                if (!btn) return null;
                btn.click();
                return 'OK: ' + btn.textContent.trim().slice(0, 50);
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
            if (!btn) return 'NOT_FOUND: ' + f;
            btn.click();
            return 'OK: ' + btn.textContent.trim().slice(0, 30);
        }}
    """)
    page.wait_for_timeout(1000)
    return r

def new_page(browser, sessao=None, extras=None):
    if sessao is None: sessao = SESSAO_ADMIN
    if extras is None: extras = DADOS_EXTRAS
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    p = ctx.new_page()
    p.goto(URL, timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(500)
    p.evaluate(f"""
        () => {{
            localStorage.setItem('co_sessao', JSON.stringify({json.dumps(sessao)}));
            localStorage.setItem('dados_extras', JSON.stringify({json.dumps(extras)}));
        }}
    """)
    p.reload(timeout=20000, wait_until="domcontentloaded")
    p.wait_for_timeout(2000)  # Mais tempo para React renderizar
    return ctx, p

def debug_body(page, label=""):
    body = page.inner_text("body")[:200].replace("\n"," ")
    btns = js(page, "() => Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,20))")
    print(f"  [{label}] body: {body[:80]}")
    print(f"  [{label}] btns: {btns[:10] if isinstance(btns, list) else btns}")

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox","--disable-gpu"])

        # ─────────────────────────────────────────────────────
        # BLOCO 1: Views (uma sessao, navegar sequencialmente)
        # ─────────────────────────────────────────────────────
        print("=== BLOCO 1: VIEWS ===")
        ctx, page = new_page(browser)
        debug_body(page, "inicial")

        views = [
            ("01_dashboard.png",  "dashboard",   "view dashboard"),
            ("02_planilha.png",   "planilha",    "view planilha"),
            ("03_operacional.png","operac",      "view operacional"),
            ("04_motoristas.png", "motori",      "view motoristas"),
            ("05_diarias.png",    "diárias",     "view diarias"),
            ("06_descarga.png",   "carga",       "view carga-descarga"),
            ("07_ocorrencias.png","ocorr",       "view ocorrencias"),
        ]
        for nome, frag, desc in views:
            r = nav_tab(page, frag)
            print(f"  Nav {frag}: {r}")
            shot(page, nome, desc)

        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 2: Admin view
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 2: ADMIN VIEW ===")
        ctx, page = new_page(browser)
        debug_body(page, "admin-fresh")

        # Clica user avatar para ir para admin
        r = click_js(page, ".co-sidebar__user")
        print(f"  Avatar click: {r}")
        page.wait_for_timeout(1500)
        debug_body(page, "apos-avatar")
        shot(page, "08_admin.png", "view admin")
        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 3: Modal Edit
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 3: MODAL EDIT ===")
        ctx, page = new_page(browser)
        nav_tab(page, "planilha")
        debug_body(page, "planilha")

        # "Nova DT" button
        r = click_btn_text(page, "nova dt", "nova DT", "NOVA DT", "nova", "+")
        print(f"  Nova DT: {r}")
        if "NOT_FOUND" in str(r):
            # Lista todos os botoes
            all_btns = js(page, "() => Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,30))")
            print(f"  Todos btns: {all_btns}")
        page.wait_for_timeout(800)
        shot(page, "08_modal_edit.png", "modal nova DT")
        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 4: Modal Detalhe
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 4: MODAL DETALHE ===")
        ctx, page = new_page(browser)
        nav_tab(page, "planilha")
        debug_body(page, "planilha-det")

        # Verifica se dados aparecem
        has_data = js(page, """
            () => {
                const body = document.body.textContent;
                return {
                    hasDT0001: body.includes('DT-0001'),
                    hasJoao: body.includes('João da Silva'),
                    bodyLen: body.length
                };
            }
        """)
        print(f"  Dados presentes: {has_data}")

        # Clica na linha com DT-0001
        r = js(page, """
            () => {
                // Tenta encontrar qualquer elemento que contenha DT-0001 e seja clicável
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.children.length <= 6 &&
                        node.textContent.includes('DT-0001') &&
                        window.getComputedStyle(node).cursor === 'pointer') {
                        node.click();
                        return 'OK (cursor=pointer): ' + node.tagName + ' ' + node.textContent.trim().slice(0,40);
                    }
                }
                // Fallback: qualquer elemento com DT-0001
                const walker2 = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
                while (node = walker2.nextNode()) {
                    if (node.children.length <= 4 && node.textContent.trim() === 'DT-0001') {
                        node.parentElement && node.parentElement.click();
                        return 'OK (parent click): ' + node.parentElement?.tagName;
                    }
                }
                return 'NOT_FOUND. Body has DT-0001: ' + document.body.textContent.includes('DT-0001');
            }
        """)
        print(f"  Click DT-0001: {r}")
        page.wait_for_timeout(1000)
        shot(page, "09_modal_detalhe.png", "modal detalhe")

        # ─────────────────────────────────────────────────────
        # BLOCO 5: OcorrModal (de dentro do modal detalhe)
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 5: OCORR MODAL ===")
        body_det = page.inner_text("body")[:300].replace("\n"," ")
        detalhe_ok = "DT-0001" in body_det or "João da Silva" in body_det

        if detalhe_ok:
            print("  Detalhe aberto, procurando botao de ocorrencia")
            r = js(page, """
                () => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const btn = btns.find(b =>
                        b.textContent.toLowerCase().includes('ocorr') ||
                        b.style.borderStyle === 'dashed'
                    );
                    if (!btn) {
                        return 'NOT_FOUND. Btns: ' + btns.filter(b=>b.offsetParent!==null)
                            .map(b=>b.textContent.trim().slice(0,20)).join(' | ');
                    }
                    btn.click();
                    return 'OK: ' + btn.textContent.trim().slice(0,40);
                }
            """)
            print(f"  Btn ocorr: {r}")
            page.wait_for_timeout(700)
            shot(page, "10_ocorr_modal.png", "ocorr modal (from detalhe)")
        else:
            print(f"  Detalhe NAO aberto ({body_det[:80]}). Tentando via OcorrenciasView")
            # Fresca para ocorrencias
            page.keyboard.press("Escape")
            nav_tab(page, "ocorr")
            # Procura botao Nova Ocorrencia
            all_btns_o = js(page, "() => Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,30))")
            print(f"  Btns ocorrencias: {all_btns_o}")
            r = click_btn_text(page, "nova", "＋", "ocorrencia", "ocorrência")
            print(f"  Nova ocorr: {r}")
            page.wait_for_timeout(700)
            shot(page, "10_ocorr_modal.png", "ocorr modal (via ocorrencias view)")

        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 6: Modal Motorista
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 6: MODAL MOTORISTA ===")
        ctx, page = new_page(browser)
        nav_tab(page, "motori")
        debug_body(page, "motoristas")

        r = click_btn_text(page, "novo", "＋ NOVO", "＋novo", "+ NOVO")
        print(f"  Btn NOVO: {r}")
        page.wait_for_timeout(800)
        shot(page, "11_modal_motorista.png", "modal motorista")
        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 7: Modal Usuario (sessao operador)
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 7: MODAL USUARIO ===")
        ctx, page = new_page(browser, SESSAO_OPERADOR)
        debug_body(page, "operador")

        r = click_js(page, ".co-sidebar__user")
        print(f"  Avatar operador: {r}")
        page.wait_for_timeout(1000)
        shot(page, "12_modal_usuario.png", "modal usuario/perfil")
        ctx.close()

        # ─────────────────────────────────────────────────────
        # BLOCO 8: Modal Config DB (admin → admin view)
        # ─────────────────────────────────────────────────────
        print("\n=== BLOCO 8: MODAL CONFIG DB ===")
        ctx, page = new_page(browser)

        # Navega para admin via user avatar
        r = click_js(page, ".co-sidebar__user")
        print(f"  Admin nav: {r}")
        page.wait_for_timeout(1500)
        debug_body(page, "admin-configdb")

        r = click_btn_text(page, "config db", "config", "configurar")
        print(f"  Config DB btn: {r}")
        page.wait_for_timeout(800)
        shot(page, "13_modal_configdb.png", "modal config db")
        ctx.close()

        browser.close()

    # ─── Sumário ───────────────────────────────────────────
    print("\n=== SUMÁRIO FINAL ===")
    all_files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    for f in all_files:
        size = os.path.getsize(os.path.join(OUT, f))
        status = "✅" if size > 20000 else "⚠️ "
        print(f"  {status}  {f}  {size:,} bytes")

if __name__ == "__main__":
    main()
