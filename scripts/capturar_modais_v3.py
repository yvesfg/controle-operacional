"""
Captura screenshots de todos os modais do Controle Operacional.
Versao 3 — usa dados injetados no localStorage para abrir ModalDetalhe.
"""

import json, time, os, sys
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\yvesf\DevYFGroup\controle operacional\docs\modal_screenshots"
os.makedirs(OUT, exist_ok=True)

URL = "http://localhost:5174"

# Sessao admin
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

# Sessao nao-admin para ModalUsuario
SESSAO_OPERADOR = {
    "perfil": "operador",
    "nome":   "Operador Teste",
    "email":  "operador@teste.com",
    "perms":  {"ver_planilha":True,"editar_planilha":True,"ver_motoristas":True},
    "ts": int(time.time() * 1000)
}

# Registro de amostra para dadosExtras — abre ModalDetalhe
REGISTRO_AMOSTRA = [
    {
        "dt": "DT-TESTE-001",
        "nome": "João da Silva Motorista",
        "cpf": "123.456.789-00",
        "placa": "ABC1D23",
        "origem": "São Paulo - SP",
        "destino": "Rio de Janeiro - RJ",
        "status": "CARREGADO",
        "cte": "CTE-99999",
        "nf": "NF001,NF002,NF003",
        "mdf": "MDF-001",
        "mat": "MAT-001",
        "vl_cte": "5000",
        "vl_contrato": "3500",
        "adiant": "500",
        "data_agenda": "2026-05-04",
        "obs": "Registro de teste para screenshot"
    }
]

def injetar_sessao(page, sessao):
    page.evaluate(f"""
        localStorage.setItem('co_sessao', JSON.stringify({json.dumps(sessao)}));
        localStorage.setItem('dados_extras', JSON.stringify({json.dumps(REGISTRO_AMOSTRA)}));
    """)

def navegar(page, texto_nav):
    """Clica no botao de navegacao da sidebar pelo texto."""
    nav = page.locator(f"button:has-text('{texto_nav}'), [data-nav='{texto_nav}']").first
    if nav.count() > 0:
        nav.click()
        page.wait_for_timeout(800)
        return True
    # Tenta por texto parcial
    btns = page.locator("button").all()
    for btn in btns:
        try:
            txt = btn.inner_text()
            if texto_nav.lower() in txt.lower():
                btn.click()
                page.wait_for_timeout(800)
                return True
        except:
            pass
    return False

def screenshot(page, nome, descricao=""):
    path = os.path.join(OUT, nome)
    page.screenshot(path=path, full_page=False)
    size = os.path.getsize(path)
    print(f"  [{nome}] {size} bytes  {descricao}")
    return path

def setup_page(browser, sessao=None):
    """Cria pagina com sessao injetada."""
    if sessao is None:
        sessao = SESSAO_ADMIN
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(URL, timeout=15000, wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    injetar_sessao(page, sessao)
    page.reload(timeout=15000, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    return ctx, page

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])

        print("=== SETUP ADMIN ===")
        ctx, page = setup_page(browser, SESSAO_ADMIN)

        # Verificar login
        title = page.title()
        print(f"  Titulo: {title}")
        body = page.inner_text("body")[:100].replace("\n", " ")
        print(f"  Body: {body}")

        # ── 01 Dashboard ──────────────────────────────────────────────
        print("\n=== 01 DASHBOARD ===")
        screenshot(page, "01_dashboard.png", "view inicial")

        # ── 02 Planilha ───────────────────────────────────────────────
        print("\n=== 02 PLANILHA ===")
        navegar(page, "Planilha")
        page.wait_for_timeout(800)
        screenshot(page, "02_planilha.png", "view planilha")

        # ── 03 Operacional ────────────────────────────────────────────
        print("\n=== 03 OPERACIONAL ===")
        navegar(page, "Operac")
        page.wait_for_timeout(800)
        screenshot(page, "03_operacional.png", "view operacional")

        # ── 04 Motoristas ─────────────────────────────────────────────
        print("\n=== 04 MOTORISTAS ===")
        navegar(page, "Motorist")
        page.wait_for_timeout(800)
        screenshot(page, "04_motoristas.png", "view motoristas")

        # ── 05 Diárias ────────────────────────────────────────────────
        print("\n=== 05 DIÁRIAS ===")
        navegar(page, "Diária")
        if not navegar(page, "Diária"):
            navegar(page, "Diaria")
        page.wait_for_timeout(800)
        screenshot(page, "05_diarias.png", "view diarias")

        # ── 06 Descarga ───────────────────────────────────────────────
        print("\n=== 06 DESCARGA ===")
        navegar(page, "Descarga")
        if not navegar(page, "Descarga"):
            navegar(page, "Carga")
        page.wait_for_timeout(800)
        screenshot(page, "06_descarga.png", "view descarga")

        # ── 07 Ocorrências ────────────────────────────────────────────
        print("\n=== 07 OCORRÊNCIAS ===")
        navegar(page, "Ocorrência")
        if not navegar(page, "Ocorrência"):
            navegar(page, "Ocorrencia")
        page.wait_for_timeout(800)
        screenshot(page, "07_ocorrencias.png", "view ocorrencias")

        # ── 08 Admin ──────────────────────────────────────────────────
        print("\n=== 08 ADMIN ===")
        navegar(page, "Admin")
        page.wait_for_timeout(800)
        screenshot(page, "08_admin.png", "view admin")

        # ── MODAL EDIT (Novo Registro) ─────────────────────────────────
        print("\n=== MODAL EDIT ===")
        navegar(page, "Planilha")
        page.wait_for_timeout(600)
        # Procura botao NOVO REGISTRO ou +
        btn_novo = None
        for sel in ["button:has-text('NOVO')", "button:has-text('＋')", "button:has-text('+')"]:
            els = page.locator(sel)
            if els.count() > 0:
                btn_novo = els.first
                break
        if btn_novo:
            btn_novo.click()
            page.wait_for_timeout(800)
            txt = page.inner_text("body")[:200].replace("\n"," ")
            print(f"  Modal edit: {txt[:80]}")
            screenshot(page, "08_modal_edit.png", "modal novo registro")
            # Fecha
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)
        else:
            print("  AVISO: botao NOVO nao encontrado")

        # ── MODAL DETALHE ──────────────────────────────────────────────
        print("\n=== MODAL DETALHE ===")
        # Ir para Dashboard onde o registro de amostra deve aparecer
        navegar(page, "Dashboard")
        page.wait_for_timeout(1000)

        abriu_detalhe = False

        # Tenta clicar em qualquer elemento com "DT-TESTE" ou "João da Silva"
        for sel in [
            "text=DT-TESTE-001",
            "text=João da Silva",
            "[style*='cursor: pointer']",
            "tr[style*='cursor']",
            "div[style*='cursor: pointer']",
        ]:
            els = page.locator(sel)
            if els.count() > 0:
                print(f"  Tentando clicar: {sel} ({els.count()} elementos)")
                els.first.click()
                page.wait_for_timeout(800)
                txt = page.inner_text("body")[:300].replace("\n"," ")
                if "DT-TESTE" in txt or "modal" in txt.lower() or "detalhe" in txt.lower() or "João" in txt:
                    print(f"  Modal detalhe abriu! body: {txt[:80]}")
                    screenshot(page, "09_modal_detalhe.png", "modal detalhe registro")
                    abriu_detalhe = True
                    break
                else:
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)

        if not abriu_detalhe:
            # Tenta na planilha
            navegar(page, "Planilha")
            page.wait_for_timeout(800)
            for sel in ["text=DT-TESTE-001", "text=João da Silva", "tr[style*='cursor']"]:
                els = page.locator(sel)
                if els.count() > 0:
                    print(f"  Planilha - clicando: {sel}")
                    els.first.click()
                    page.wait_for_timeout(800)
                    txt = page.inner_text("body")[:300].replace("\n"," ")
                    if "DT-TESTE" in txt or "João" in txt:
                        screenshot(page, "09_modal_detalhe.png", "modal detalhe (via planilha)")
                        abriu_detalhe = True
                        break
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)

        if not abriu_detalhe:
            print("  AVISO: nao conseguiu abrir ModalDetalhe via clique")
            print("  Tentando via JavaScript — forcar abertura do modal...")
            # Injecao direta via React dev tools approach
            result = page.evaluate("""
                () => {
                    // Busca botoes com texto DT ou registro
                    const all = Array.from(document.querySelectorAll('*'));
                    const found = all.filter(el =>
                        el.textContent &&
                        el.textContent.includes('DT-TESTE') &&
                        el.children.length < 5
                    );
                    if (found.length > 0) {
                        found[0].click();
                        return 'clicked: ' + found[0].tagName + ' ' + found[0].textContent.slice(0,50);
                    }
                    return 'not found';
                }
            """)
            print(f"  JS result: {result}")
            page.wait_for_timeout(800)
            screenshot(page, "09_modal_detalhe.png", "modal detalhe (tentativa JS)")

        # ── OCORR MODAL (de dentro do ModalDetalhe) ────────────────────
        print("\n=== OCORR MODAL ===")
        if abriu_detalhe:
            # Procura botao "Nova Ocorrência" dentro do modal
            for sel in ["button:has-text('Nova Ocorr')", "button:has-text('Ocorrência')",
                        "button:has-text('＋ Ocorr')", "[style*='dashed']"]:
                els = page.locator(sel)
                if els.count() > 0:
                    print(f"  Botao ocorrencia: {sel}")
                    els.first.click()
                    page.wait_for_timeout(600)
                    screenshot(page, "10_ocorr_modal.png", "modal ocorrencia unificado")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                    break
            else:
                screenshot(page, "10_ocorr_modal.png", "ocorr modal (nao encontrado botao)")
            # Fecha o modal detalhe
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)
        else:
            # Abre OcorrModal a partir de OcorrenciasView
            navegar(page, "Ocorrência")
            page.wait_for_timeout(800)
            for sel in ["button:has-text('Nova')", "button:has-text('＋')"]:
                els = page.locator(sel)
                if els.count() > 0:
                    els.first.click()
                    page.wait_for_timeout(600)
                    screenshot(page, "10_ocorr_modal.png", "ocorr modal (via ocorrencias view)")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                    break
            else:
                screenshot(page, "10_ocorr_modal.png", "ocorr modal nao capturado")

        # ── MODAL MOTORISTA ────────────────────────────────────────────
        print("\n=== MODAL MOTORISTA ===")
        navegar(page, "Motorist")
        page.wait_for_timeout(800)
        # Procura botao NOVO
        found_mot = False
        for sel in ["button:has-text('NOVO')", "button:has-text('＋ NOVO')", "button:has-text('+')"]:
            els = page.locator(sel)
            if els.count() > 0:
                print(f"  Botao motorista: {sel} ({els.count()})")
                els.first.click()
                page.wait_for_timeout(800)
                txt = page.inner_text("body")[:200].replace("\n"," ")
                print(f"  Apos click: {txt[:80]}")
                screenshot(page, "11_modal_motorista.png", "modal novo motorista")
                found_mot = True
                page.keyboard.press("Escape")
                page.wait_for_timeout(400)
                break
        if not found_mot:
            # Lista todos os botoes na pagina
            btns = page.locator("button").all()
            btns_txt = [b.inner_text() for b in btns[:20]]
            print(f"  Botoes encontrados: {btns_txt}")
            screenshot(page, "11_modal_motorista.png", "motoristas - modal nao abriu")

        # ── MODAL CONFIG DB ────────────────────────────────────────────
        print("\n=== MODAL CONFIG DB ===")
        navegar(page, "Admin")
        page.wait_for_timeout(1000)
        found_cfg = False
        for sel in ["button:has-text('Config')", "button:has-text('DB')",
                    "button:has-text('Configurar')", "button:has-text('Banco')"]:
            els = page.locator(sel)
            if els.count() > 0:
                print(f"  Botao configdb: {sel}")
                els.first.click()
                page.wait_for_timeout(800)
                screenshot(page, "13_modal_configdb.png", "modal configurar banco")
                found_cfg = True
                page.keyboard.press("Escape")
                page.wait_for_timeout(400)
                break
        if not found_cfg:
            # Lista botoes
            btns = page.locator("button").all()
            btns_txt = [b.inner_text()[:30] for b in btns[:30]]
            print(f"  Botoes admin: {btns_txt}")
            screenshot(page, "13_modal_configdb.png", "configdb - nao encontrado")

        ctx.close()

        # ── MODAL USUARIO (sessao operador) ────────────────────────────
        print("\n=== MODAL USUARIO (sessao operador) ===")
        ctx2, page2 = setup_page(browser, SESSAO_OPERADOR)
        page2.wait_for_timeout(500)
        body2 = page2.inner_text("body")[:100].replace("\n"," ")
        print(f"  Operador body: {body2}")

        # Clica no avatar do usuario na sidebar
        found_usr = False
        for sel in ["[class*='user']", "[class*='sidebar__user']", ".co-sidebar__user",
                    "div[style*='border-radius: 50%']", "div[style*='border-radius:50%']"]:
            els = page2.locator(sel)
            if els.count() > 0:
                print(f"  Avatar selector: {sel} ({els.count()})")
                els.first.click()
                page2.wait_for_timeout(800)
                txt = page2.inner_text("body")[:300].replace("\n"," ")
                if "perfil" in txt.lower() or "usuario" in txt.lower() or "senha" in txt.lower():
                    print(f"  ModalUsuario: {txt[:80]}")
                    screenshot(page2, "12_modal_usuario.png", "modal usuario/perfil")
                    found_usr = True
                    break
                else:
                    page2.keyboard.press("Escape")

        if not found_usr:
            # Lista elementos clicaveis na sidebar
            els = page2.locator("[style*='cursor: pointer'], [style*='cursor:pointer']").all()
            print(f"  Elementos clicaveis: {len(els)}")
            for i, el in enumerate(els[:10]):
                try:
                    txt = el.inner_text()[:40]
                    print(f"    [{i}] {txt!r}")
                except:
                    pass
            screenshot(page2, "12_modal_usuario.png", "modal usuario - nao capturado")

        ctx2.close()

        browser.close()

    print("\n=== DONE ===")
    files = sorted(os.listdir(OUT))
    for f in files:
        if f.endswith(".png"):
            size = os.path.getsize(os.path.join(OUT, f))
            print(f"  {f}  {size:,} bytes")

if __name__ == "__main__":
    main()
