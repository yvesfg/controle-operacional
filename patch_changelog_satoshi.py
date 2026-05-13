path = r'C:\Users\yvesf\DevYFGroup\controle operacional\src\constants.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

marker = 'export const DEV_CHANGELOG = ['
new_entry = (
    'export const DEV_CHANGELOG = [\n'
    '  {\n'
    '    data: "2026-05-13", sessao: "Sessao 18",\n'
    '    itens: [\n'
    '      "REFAC - Tipografia: Substituido Syne (headings) + Barlow (body) por Satoshi (Fontshare) como fonte unificada de display + body; IBM Plex Mono mantido para dados/codigos; preconnect adicionado para api.fontshare.com; letter-spacing recalibrado para -0.025em (display) / -0.005em (body); referencia hardcoded removida do App.jsx linha 1954; zero alteracao de JSX - tudo via tokens.css.",\n'
    '    ],\n'
    '  },'
)

if marker in content:
    content = content.replace(marker, new_entry, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('constants.js atualizado com Sessao 18.')
else:
    print('MARKER NAO ENCONTRADO')
