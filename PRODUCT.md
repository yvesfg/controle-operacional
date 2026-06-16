# Product

## Register

product

## Users

Operadores e gestores da **YFGroup Transportes** (transportadora de cargas). Equipe interna distribuída por múltiplas filiais/bases — Açailândia (AVB), Imperatriz, Belém, Maracanaú. Usam o app em dois contextos que coexistem:

- **No escritório**, em desktop, para gestão: conferir margens vs. despesas, créditos pendentes, duplicidades, fechar diárias e ocorrências, administrar usuários.
- **No campo/celular**, em galpão ou trânsito, para registrar e consultar rapidamente: status de viagens (em trânsito / no prazo / atraso), carga/descarga, ocorrências.

O trabalho é orientado a dados operacionais reais (CTes, contratos, viagens, motoristas) sincronizados entre Google Sheets e Supabase. O usuário não está explorando — está executando uma tarefa concreta e precisa achar o número certo ou registrar o evento em segundos.

## Product Purpose

Centralizar o controle operacional logístico da YFGroup: gestão de viagens, pós-carga (diárias, carga/descarga, ocorrências), operacional (SGS), financeiro (margem, despesas, créditos pendentes) e administração — por filial. Substitui o controle disperso em planilhas por um sistema único, confiável e auditável.

Sucesso = o operador confia nos números sem reconferir na planilha, registra eventos sem fricção do celular no campo, e o gestor enxerga margem, despesas e pendências de cada base de relance. A consistência entre Sheets e Supabase nunca surpreende o usuário.

## Brand Personality

**Sóbrio · técnico · premium.** Voz de ferramenta de trabalho séria, não de produto de consumo. Estética dark refinada (referência terminal financeiro), acento violeta da marca YFGroup usado com parcimônia. Nada decorativo: cada pixel serve a leitura do dado ou ao registro da ação. Transmite que os números são precisos e o sistema é caro/profissional — sem gritar.

## Anti-references

- **Planilha / ERP cru** (SAP, TOTVS legado): cinza, denso-sem-hierarquia, feio, cara de sistema dos anos 2000. O app é denso, mas denso *com hierarquia e respiro*.
- **SaaS genérico claro**: template "startup" claro com cards idênticos repetidos, gradientes decorativos, eyebrows tracked em cada seção, hero-metric. Sem identidade.
- **Dashboard colorido demais**: excesso de cores e widgets concorrentes que viram ruído. A cor carrega *significado* (status: trânsito/prazo/atraso/crítico), não enfeite.

## Design Principles

1. **Densidade a serviço da decisão.** Muita informação por tela é uma feature, não um defeito — mas sempre com hierarquia clara, agrupamento e respiro suficiente para ler sem cansar. Denso ≠ apertado.
2. **A cor significa estado.** Os acentos (cyan/verde/laranja/vermelho/amarelo) codificam status operacional. Cor sem significado é proibida; o violeta da marca é identidade, não decoração de seção.
3. **Confiança pela precisão.** O usuário só larga a planilha se confiar no número. Estados (em trânsito, atraso, sem crédito, duplicidade) precisam ser inequívocos; nada de ambiguidade ou dado "quase certo".
4. **Adaptar à superfície, não só ao tamanho.** Campo/celular e escritório/desktop são contextos diferentes: a densidade e o que se prioriza muda por tela conforme o uso real, não apenas o layout reflui no breakpoint.
5. **Consistência global.** Uma decisão visual ou de interação pedida numa tela vale para o app inteiro (ex.: checkbox → Toggle em todo lugar). Preservar o que já funciona; mudar de forma uniforme.

## Accessibility & Inclusion

- **WCAG 2.1 AA de contraste** como piso, especialmente crítico para uso em celular sob luz forte de galpão/campo — texto de corpo sempre legível sobre o fundo dark (≥4.5:1; ≥3:1 para texto grande). Evitar texto cinza-claro "elegante" que some na tela.
- **Dois contextos de uso, ambos atendidos:** layout e densidade responsivos a celular (toque, telas pequenas, campo) e a desktop (gestão densa, escritório). Alvos de toque adequados no mobile.
- **`prefers-reduced-motion` respeitado** em qualquer animação — alternativa de crossfade/instantânea. Movimento nunca distrai do trabalho operacional.
