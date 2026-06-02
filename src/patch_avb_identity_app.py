import shutil, datetime, sys

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_avb_identity_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Adiciona data-base="avb" no <html> ao trocar de base
old = """  // Save theme + sincroniza data-theme no <html> para o design system CSS
  useEffect(() => {
    saveJSON("co_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);"""

new = """  // Save theme + sincroniza data-theme no <html> para o design system CSS
  useEffect(() => {
    saveJSON("co_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Identidade visual AVB — aplica data-base="avb" exclusivamente para Açailândia
  useEffect(() => {
    if (baseAtual?.id === "acailandia_avb") {
      document.documentElement.setAttribute('data-base', 'avb');
    } else {
      document.documentElement.removeAttribute('data-base');
    }
  }, [baseAtual]);"""

if old not in c:
    print("ERRO: trecho não encontrado no App.jsx"); sys.exit(1)

c = c.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("OK: data-base AVB identity adicionado ao App.jsx")
