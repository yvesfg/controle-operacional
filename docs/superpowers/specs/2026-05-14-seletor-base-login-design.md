# Seletor de Base Operacional na Tela de Login

**Data:** 2026-05-14  
**Status:** Aprovado

---

## Contexto

O app Controle Operacional usa uma planilha Google Sheets (Imperatriz/Belém) sincronizada via Apps Script → Supabase (`controle_operacional`). Uma segunda base operacional (Maracanã) foi criada com planilha própria e precisa de tabela própria no Supabase. O usuário escolhe qual base acessar na tela de login.

---

## Objetivo

Adicionar um seletor de base na tela de login que:
- Aparece somente quando o usuário tem acesso a mais de uma base
- Auto-seleciona silenciosamente se o usuário tem acesso a apenas uma
- É controlado pelo admin (quais bases cada usuário pode ver)
- Suporta adição futura de Belém como base independente com zero refatoração

---

## Arquitetura

### 1. Config de Bases — `constants.js`

Objeto central que mapeia `id → { label, table }`. Toda referência à tabela de dados passa por aqui.

```js
export const BASES = {
  imperatriz_belem: {
    id: 'imperatriz_belem',
    label: 'Imperatriz / Belém',
    table: 'controle_operacional',
  },
  maracanau: {
    id: 'maracanau',
    label: 'Maracanã',
    table: 'controle_operacional_maracanau',
  },
  // Futuro Belém independente: adicionar aqui + criar tabela no Supabase
}
```

### 2. Supabase

**Nova tabela:** `controle_operacional_maracanau`
- Schema idêntico a `controle_operacional`
- Criada via: `CREATE TABLE controle_operacional_maracanau (LIKE controle_operacional INCLUDING ALL);`

**Alteração em `co_usuarios`:**
- Nova coluna: `bases_permitidas jsonb NOT NULL DEFAULT '["imperatriz_belem"]'`
- Usuários existentes recebem o default automaticamente (sem quebrar nada)
- Admin atualiza manualmente para dar acesso a bases adicionais

### 3. Apps Script

Dois scripts separados, um por planilha (bound script):

| Planilha | `TABELA` | `STATUS_KEY` |
|---|---|---|
| Imperatriz / Belém | `controle_operacional` | `gsheet_sync_status_imperatriz_belem` |
| Maracanã | `controle_operacional_maracanau` | `gsheet_sync_status_maracanau` |

O script de Maracanã é cópia do existente com essas duas variáveis alteradas.

---

## Fluxo de Login

```
1. Usuário autentica (Google OAuth ou email/senha) — igual a hoje
2. App busca bases_permitidas do usuário em co_usuarios
3a. Se 1 base → seleciona automaticamente, entra no app (sem mudança visual)
3b. Se 2+ bases → exibe seletor de base dentro do card de login
4. Usuário clica na base desejada
5. baseAtual = { id, label, table } salvo em estado React + localStorage
6. App carrega usando baseAtual.table em todas as queries
```

---

## UI — Seletor de Base

Aparece dentro do card de login existente (maxWidth 360px), após autenticação bem-sucedida, **substituindo** o formulário de email/senha.

- Título: "Selecione a base de operação"
- Um card clicável por base permitida
- Ícone + nome da base + descrição curta
- Borda dourada ao hover (padrão do design system)
- Sem botão extra — clique no card confirma a seleção

**Badge de base ativa no app:** pequeno indicador no header/navbar mostrando qual base está ativa durante a sessão (ex: `● Maracanã`).

---

## Estado — `baseAtual`

Novo estado em `App.jsx`:
```js
const [baseAtual, setBaseAtual] = useState(() => {
  const saved = localStorage.getItem('co_base_atual');
  return saved ? JSON.parse(saved) : null;
});
```

- `null` = seletor ainda não foi escolhido (exibe UI do seletor)
- Objeto `BASES[id]` = base selecionada
- Persistido em `localStorage` para não pedir na próxima sessão do mesmo usuário
- Limpo no logout

---

## Queries de Dados

Todas as chamadas que hoje referenciam `'controle_operacional'` hardcoded passam a usar `baseAtual.table`.

**Tabelas afetadas pela base:**
- `controle_operacional` → `baseAtual.table` ✓

**Tabelas compartilhadas (não mudam):**
- `co_usuarios`, `co_config`, `co_ocorrencias`, `co_apontamentos`, `co_logs_alteracoes`

O status de sync do Apps Script é lido pelo AdminView usando a chave `gsheet_sync_status_${baseAtual.id}`.

---

## Admin — Gerenciamento de Bases por Usuário

Na tela de gerenciamento de usuários (`AdminView`), ao editar um usuário:

- Nova seção: **"Bases de acesso"**
- Checkbox por base disponível em `BASES`
- Salva array atualizado em `co_usuarios.bases_permitidas`
- SQL para dar acesso manual:
  ```sql
  UPDATE co_usuarios
  SET bases_permitidas = '["imperatriz_belem","maracanau"]'::jsonb
  WHERE email = 'email@do.usuario';
  ```

---

## Extensibilidade — Belém Independente (Futuro)

Quando Belém ganhar planilha e tabela próprias:
1. Criar tabela `controle_operacional_belem` no Supabase
2. Adicionar entrada em `BASES` no `constants.js`
3. Criar Apps Script na planilha de Belém com `TABELA = 'controle_operacional_belem'`
4. Atualizar `bases_permitidas` dos usuários de Belém

Nenhuma outra mudança de código necessária.

---

## O Que Não Muda

- Fluxo de autenticação (Google OAuth / email+senha)
- Schema de `co_usuarios` além da nova coluna
- Todas as outras tabelas Supabase
- Lógica de permissões (admin/gerente/operador/visualizador)
- Design system e tema dark/light
