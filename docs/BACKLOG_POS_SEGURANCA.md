# Backlog — features para DEPOIS da fase de segurança

Pedidos do Yves (2026-07-22) para fazer assim que terminarmos o endurecimento de segurança (V2). Não começar antes de fechar o lockdown das tabelas operacionais.

## 1. Cadastro de Motorista — campos bancários (tela Cadastros → Motoristas)
Arquivos prováveis: `src/modals/ModalMotorista.jsx` (form) + `src/views/cadastros/MotoristasCad.jsx`.
Coluna nova no banco: `motoristas` (tabela Supabase) — ver `src/motoristas.js` + RPCs `criar_motorista`/`atualizar_motorista` (migration 025) que precisarão incluir os campos novos no INSERT/patch.

- [ ] **COD BCO** — campo de texto **não obrigatório** para o código do banco (ex.: 260 Nubank, 001 BB). Fica ao lado de "Banco". Nova coluna `cod_banco text` em `motoristas`.
- [ ] **PIX** — campo de chave PIX **com seletor de tipo**: `aleatório | email | CPF/CNPJ | telefone`.
      Sugestão: 2 colunas novas — `pix_tipo text` (enum-like) + `pix_chave text`. Validar a chave conforme o tipo (CPF/CNPJ e telefone reaproveitam `normalizarTelefone`/validação de CPF já existentes em `src/utils.js`/`src/validators.js`).

> Lembrar: ao adicionar colunas, atualizar as RPCs `criar_motorista`, `criar_motoristas_lote` e `atualizar_motorista` (whitelist de colunas em `atualizar_motorista`) na migration nova, senão os campos não gravam (a tabela está fechada pra escrita anon direta).

## 2. Conferência de Frete — Sinalizados/Revisados clicáveis (abrir modal de detalhe)
Tela: Conferência de Frete → seções "SINALIZADOS" e "REVISADOS" (ver `src/views/ConferenciaFrete.jsx`).

- [ ] Tornar **cada item clicável** (tanto em SINALIZADOS quanto em REVISADOS).
- [ ] Ao clicar, **abrir modal** mostrando a **diferença re-verificada** e **todos os valores envolvidos** no cálculo (o mesmo detalhamento que gerou a flag).
- [ ] Objetivo duplo: (a) reverificar a diferença antes de decidir; (b) depois de revisado/sinalizado, poder **rever qual era o erro** que motivou a decisão.
- Dados: reaproveitar `src/freteConferencia.js` (linhas já têm os campos de valor/flags). Provavelmente um novo modal em `src/modals/` ou reuso do padrão de `ModalDetalhe`.
