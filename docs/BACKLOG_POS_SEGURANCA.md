# Backlog — features para DEPOIS da fase de segurança

Pedidos do Yves (2026-07-22) para fazer assim que terminarmos o endurecimento de segurança (V2). Não começar antes de fechar o lockdown das tabelas operacionais.

## 1. Cadastro de Motorista — campos bancários (tela Cadastros → Motoristas)
Arquivos prováveis: `src/modals/ModalMotorista.jsx` (form) + `src/views/cadastros/MotoristasCad.jsx`.
Coluna nova no banco: `motoristas` (tabela Supabase) — ver `src/motoristas.js` + RPCs `criar_motorista`/`atualizar_motorista` (migration 025) que precisarão incluir os campos novos no INSERT/patch.

- [ ] **COD BCO** — campo de texto **não obrigatório** para o código do banco (ex.: 260 Nubank, 001 BB). Fica ao lado de "Banco". Nova coluna `cod_banco text` em `motoristas`.
- [ ] **PIX** — campo de chave PIX **com seletor de tipo**: `aleatório | email | CPF/CNPJ | telefone`.
      Sugestão: 2 colunas novas — `pix_tipo text` (enum-like) + `pix_chave text`. Validar a chave conforme o tipo (CPF/CNPJ e telefone reaproveitam `normalizarTelefone`/validação de CPF já existentes em `src/utils.js`/`src/validators.js`).

> Lembrar: ao adicionar colunas, atualizar as RPCs `criar_motorista`, `criar_motoristas_lote` e `atualizar_motorista` (whitelist de colunas em `atualizar_motorista`) na migration nova, senão os campos não gravam (a tabela está fechada pra escrita anon direta).

## 2. Conferência de Frete — Sinalizados/Revisados clicáveis (abrir modal de detalhe) — ✅ FEITO (2026-07-23, Fase 1)
Tela: Conferência de Frete → seções "SINALIZADOS" e "REVISADOS" (ver `src/views/ConferenciaFrete.jsx`).

- [x] Itens de SINALIZADOS e REVISADOS clicáveis → abrem o modal existente (`abrirRevisar`).
- [x] Modal mostra todos os valores + a decisão registrada (quem/quando/obs) + botão Estornar.
- [x] Bônus: bloco "CTes · {cliente}" ao clicar num cliente em "Por cliente" (lista clicável → mesmo modal).
- [ ] **Fase 2 (pendente):** edição COMPLETA de CTe só pra admin (corrigir FOB/CIF, categoria, valores brutos)
      via nova RPC `editar_frete` admin-gated + campos editáveis no modal. Requer `perfil` no ctx do FinanceiroView.
