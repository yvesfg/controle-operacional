## 2026-08-18 — Organizar painel: arrastar, tirar e devolver cards do Dashboard

**Pedido:** poder clicar e arrastar para reorganizar, tirar ou adicionar um KPI no Dashboard. Escolhido: valer tambem para os blocos maiores, com o layout salvo no Supabase por usuario.

**Como ficou.** Botao "Organizar painel" no fim da barra de filtros liga o modo edicao. Nele:
- **KPIs** (faixa do topo): arrasta para reordenar, ✕ tira, e a gaveta logo abaixo devolve o que saiu.
- **Blocos**: a linha do meio (Evolucao / Status / Top motoristas) e a coluna da direita (Diarias / Descargas / Top destinos / Diarias pendentes) reordenam por arrasto entre si. Os cards de largura cheia — Comparativo por base, Rastreamento documental, Ranking por cliente e Registros recentes — tem ✕ mas nao arrastam: eles ocupam pontos fixos da pagina, entao mudar a ordem deles exigiria remontar o layout, o que ficou de fora. Uma gaveta unica, logo abaixo dos KPIs, lista todos os blocos que sairam.

**Onde salva.** `config.dash` do proprio usuario em `hub_user_modulos`, agora com a chave `ordem: { kpis:[ids], blocos:[ids] }` alem do `kpis/blocos: {id:false}` que ja existia. A escrita passa pela RPC nova `hub_set_meu_dash` (migration 064), que troca SO a chave `dash` — perfil, perms e bases continuam so na mao do admin. Sem policy de UPDATE aberta na tabela.

**Detalhes que importam.**
- Arrasto proprio com Pointer Events (`src/hooks/useDragOrdem.js`): a API de drag-and-drop do HTML5 nao dispara em toque, e metade do uso do app e no celular. A ordem e marcada em ref, nao em state: o React 18 so roda o updater do setState no render seguinte, e o `pointerup` do mesmo gesto leria o valor velho — o arrasto reordenava na tela mas nao salvava.
- Card que a base nao tem nao aparece na gaveta (KPI financeiro para quem nao ve valores, diaria pendente quando nao ha saldo).
- Id que nao esta na ordem salva vai pro fim, na ordem do codigo — KPI novo numa versao futura nao some por falta de registro.

**Pendente:** rodar a migration 064 no Supabase.

## 2026-08-18 — Hotfix: tela em branco (ErrorBoundary) ao abrir qualquer modulo em producao

**Sintoma:** apos logar e clicar no modulo, "Algo deu errado nesta tela" em todo lugar. Console: `ReferenceError: buscaMesmaPlaca is not defined`.

**Causa:** no commit anterior (busca por nome), `AppModals.jsx` passou a repassar `buscaMesmaPlaca`, `setBuscaMesmaPlaca`, `buscaCandidatos`, `setBuscaCandidatos`, `mostrarRegistro` para o `ModalBusca`, mas esses nomes nao foram acrescentados na desestruturacao do PROPRIO `ctx` do `AppModals` (topo do arquivo). Em shorthand de objeto (`{buscaMesmaPlaca, ...}`) isso vira referencia a variavel livre — o build local passou porque Vite/esbuild nao falha nisso, so estoura em runtime. `AppModals` e montado sempre (nao so quando o modal de busca abre), entao quebrava a tela inteira assim que qualquer modulo carregava.

**Fix:** adicionadas as 5 variaveis na desestruturacao de `ctx` em `AppModals.jsx`. Confirmado no bundle minificado: antes havia `buscaMesmaPlaca,setBuscaMesmaPlaca,...` sem apelido (variavel nao resolvida); depois, `buscaMesmaPlaca:d` (variavel local normal).

## 2026-08-18 — Busca por nome e todas as viagens no modal de busca

**Pedido:** buscar tambem por nome, e o modal que abre mostrar nao so os dados como todas as viagens feitas pela pessoa — valendo para qualquer tipo de busca.

**Feito:**
- **Aba NOME** (4a opcao, ao lado de DT/CPF/PLACA): busca parcial, ignorando acento e caixa. Quando o termo casa com mais de um motorista (ex.: "silva"), aparece a lista deles — nome, CPF, placa e total de viagens — para escolher; com um so, abre o resultado direto.
- **"Todas as viagens deste motorista"** substitui o antigo "Outros DTs": a lista agora e da PESSOA (mesmo CPF, ou mesmo nome quando a linha nao tem CPF), com a viagem aberta marcada como ABERTA, contador "23 no total" e paginacao de 10 em 10 ("Ver mais 10 ›"). Antes mostrava no maximo 10 e terminava num texto morto "… e mais N".
- **"Mesma placa, outro motorista"** e um bloco separado. Antes as viagens do caminhao com outro motorista vinham misturadas na mesma lista, como se fossem dele.
- Vale para os quatro tipos de busca; o historico recente tambem passa pelo mesmo caminho (antes ele nao recalculava tudo).

Estados novos `buscaMesmaPlaca` e `buscaCandidatos` em `useBuscaState`; a montagem das listas ficou em `useBuscarHandlers` (`mostrarRegistro`), que o modal reusa a cada clique.

**Nota:** o modal de busca recebe `canFin`/`fmtMoeda` sem que o App os passe no ctx — o bloco de valores (Empresa/Motorista/Adiantamento) nunca aparece. Nao mexi, e correcao separada.

## 2026-08-18 — Drill do motorista: botao Voltar e historico completo paginado

**Pedido:** botao para voltar a tela anterior depois de clicar no motorista; e a duvida se as viagens listadas eram do mes ou todas — o ideal seriam todas, 10 por tela.

**Como estava:** o clique no motorista mostrava no maximo 5 viagens e so as do periodo filtrado no dashboard (`dashData.filtrado`), sem volta.

**Feito:** o historico agora sai de `DADOS` (a base inteira carregada, sem recorte de mes), ordenado da viagem mais recente para a mais antiga, exibindo 10 por vez com "Ver mais 10 ›" e o contador "10 de 40". O modal guarda a tela anterior em `voltar` e mostra um botao ‹ Voltar no cabecalho (so o icone no mobile) que devolve a lista de destinos com a rota que estava aberta. Vale tambem para o drill de motoristas e de rota, nao so para o accordion. De quebra, "40 viagems" virou "40 viagens".

## 2026-08-18 — Top Destinos clicavel: todos os destinos + motoristas

**Pedido:** no Dashboard, o bloco Top Destinos devia ser clicavel e mostrar todos os destinos com os motoristas que rodaram cada um, em formato colapsavel e responsivo (desktop, tablet e mobile).

**Feito:** clicar em qualquer linha do Top Destinos (ou no "Ver todos") abre o modal de drill-down do dashboard num modo novo (`type: "destinos"`), que lista TODOS os destinos do periodo em accordion. Cada destino mostra volume, barra relativa, quebra por base e, ao abrir, os motoristas da rota (viagens, placa e DTs) num grid que vira 1 coluna no mobile e 2-3 colunas em tablet/desktop. Clicar no motorista abre o historico recente dele; "Ver na planilha" mantem o atalho antigo de filtrar a Planilha pelo destino.

- Novo componente `src/modals/DestinosAccordion.jsx`; o `ModalDashDrill` so ganhou o desvio para ele (largura 860 nesse modo).
- Nenhuma aba ou botao novo no dashboard: o contador "5 destinos" do cabecalho virou o link "Ver todos".

## 2026-08-06 — Conferência de faturamento: o que é frete e o que só parece

**Pedido do Yves:** verificar (a) se as diárias D01/D05 e as minutas de descarga estão entrando como faturamento (frete) e contabilizando no saldo, e (b) se o valor negativo da planilha de débitos mensais está entrando como "lucro". Planilha de julho anexada, ainda não importada.

**Resposta: sim nos dois casos.** Segue o que foi medido e o que foi feito.

### (a) Diária e descarga somando no "Frete" e no "Saldo"

O resumo "Por cliente" soma `frete_peso` e `saldo` de **todas** as categorias. Em 07/2026:

| Categoria | Cód. | CTes | No "Frete" | No "Saldo" |
|---|---|---:|---:|---:|
| Diária Imperatriz | D01 | 56 | R$ 58.042,11 | − R$ 58.000,00 |
| Descarga Imperatriz | MAM | 126 | R$ 245.098,44 | R$ 0,00 |
| Descarga Belém | MRM | 25 | R$ 63.386,00 | R$ 0,00 |
| **Subtotal** | | **207** | **R$ 366.526,55** | **− R$ 58.000,00** |

São **11,6% dos R$ 3.162.762,85** exibidos como faturamento. Sem elas: Frete R$ 2.796.236,30 · Saldo R$ 567.952,17. A coluna Margem não é afetada — ela amostra só a categoria `frete`.

Dois pontos que **não** foram alterados, por serem da fonte:
- **A diária é contraditória na origem.** O TMS manda `Frete Peso = Contrato` e `Saldo = −Contrato` (CTRC 314: 400 / 400 / −400). O app soma os R$ 58.042,11 como receita **e** os −R$ 58.000 como custo ao mesmo tempo.
- **Belém não teve nenhum D05 em 07 e 08/2026**, tendo tido todo mês de 01 a 06 (1/0/5/4/3/2). O código D05 está cadastrado corretamente na embarcadora, então não é falha de classificação — pendente de conferência.

**Feito:** toggle **"Incluir diária e descarga"** na faixa de controles da Conferência, ligado por padrão (mantém o número de hoje). Desligado, recalcula "Por cliente", "Evolução diária" e o comparativo dos 2 meses anteriores — o comparativo usa o **mesmo** recorte, senão a variação % sairia inventada. Os KPIs por categoria ficam intactos de propósito: são eles que mostram quanto foi retirado.

### (b) Negativo da planilha de débitos virando lucro

Todo valor negativo virava `tipo='credito'` e abatia despesa (`despLiq = débitos + créditos`), sem distinguir **estorno de despesa** (dinheiro que volta de algo pago) de **receita** (dinheiro que entra por outra via).

Na planilha de julho: **R$ 99.554,17 de negativos, dos quais R$ 97.699,37 são receita** — R$ 93.838,50 de "Receitas com Sinistro" (Berkley), R$ 2.520,00 de venda de cinta/gancho e R$ 1.340,87 de venda de avarias. Só R$ 1.854,80 ("Devolução de fornecedor E") é estorno de verdade.

Se julho fosse importado como estava, **Açailândia iria de R$ 88.250,79 de despesa para − R$ 8.174,99** (despesa negativa), jogando R$ 96.425,78 direto no Resultado. O padrão já estava gravado: 03/2026 com −R$ 58.613,19 de sinistro e 04/2026 com −R$ 285.471,08 (quase tudo em linhas "CTE .../..." de faturamento).

**Migration 050** (aplicada em produção 2026-08-06, via MCP): `despesas_filial` ganha `classe_credito` (`estorno` | `receita`, NULL em débito) com CHECK; backfill dos créditos já gravados; `inserir_despesas_lote` e `atualizar_despesa` recriadas com a coluna. Default `estorno` = comportamento antigo, então nada muda sozinho.

**Regra:** natureza começando com `Receita`, `Venda` ou `CTE ` é receita; todo o resto é estorno. Conservadora de propósito — os 13 créditos ambíguos já gravados (Desconto Cliente, Fretes, Peças, Manutenção, Seguro) seguem como estorno e podem ser corrigidos linha a linha.

**Feito no app:** KPI "Receitas" (fora do resultado), "Créditos" virou "Créditos (estorno)", badge RECEITA na linha, subtotal do grupo exclui receita, e o modal de seleção de abas lista os negativos reconhecidos como receita **antes** de gravar. No ModalDespesa, seletor estorno × receita.

### Base de comissão definida

**Decisão do Yves:** a comissão sai do **saldo dos relatórios de frete que ele sobe**, menos os **débitos que recebem depois**. Fica assim, e não pelo Resultado (que usa o operacional).

Novo bloco na Conferência, uma linha por base — 07/2026:

| Base | Saldo fretes | Débitos (líquidos) | Comissionável |
|---|---:|---:|---:|
| Açailândia - AVB | R$ 171.655,88 | **+ R$ 8.174,99** | **R$ 179.830,87** |
| Imperatriz / Belém | R$ 338.296,29 | − R$ 119.085,96 | **R$ 219.210,33** |
| **Total** | **R$ 509.952,17** | **− R$ 110.910,97** | **R$ 399.041,20** |

Açailândia soma em vez de descontar porque em 07/2026 os créditos (R$ 96.425,78) superaram os débitos (R$ 88.250,79). A tela diz isso em verde, com o quanto veio de recuperação — um mês assim não pode passar despercebido.

O casamento das duas fontes é por `base_id` — a Conferência já traz a base em cada CTe (via cadastro da embarcadora) e a despesa é gravada por base. Não precisa de mapeamento manual **nem depende da conciliação CTe a CTe**, que segue divergindo e agora não bloqueia mais o cálculo.

**Todo crédito abate**, incluindo recuperação de sinistro/avaria/venda — ver a correção da migration 050 abaixo.

Badge **"débitos não importados"** na base cujo mês ainda não recebeu a planilha — que é o caso normal, já que ela chega no mês seguinte. Sem isso o comissionável apareceria inflado como se fosse definitivo. O filtro de cliente não se aplica ao bloco (débito chega por base, não por cliente) e a tela avisa quando o filtro está ligado.

### Correção da migration 050 — todo crédito volta a abater

**O Yves apontou:** o crédito de R$ 93.838,50 em Açailândia não estava entrando no cálculo, e deveria. Ele está certo, e a planilha comprova de duas formas.

**1. A própria planilha já entrega o total líquido.** A aba `imp` de 07/2026 declara `TOTAL DE DESPESAS = 111.545,68`, que é exatamente 114.674,07 de débito menos 3.128,39 de crédito — e esses créditos incluem "Venda de Avarias", que eu havia classificado como receita. Quem monta a planilha abate tudo; o "débito que mandam" é o líquido. (A aba `açai` não tem linha de TOTAL — por isso ninguém tinha percebido que ela fecha em −R$ 8.174,99.)

**2. O sinistro tem contrapartida de despesa na mesma base.** Açailândia paga `SINISTRO AÇO VERDE 8x10`, `9x10`, `10x10` — R$ 6.851,31 por mês, com histórico "TOTAL 164.615,31 −96100,00 = 68515,31". É um prejuízo parcelado que a empresa está pagando, e o crédito da Berkley é o reembolso do seguro **desse mesmo prejuízo**. Recuperação de custo, não receita nova. Mesma lógica vale para venda de avaria e de cinta/gancho.

A separação da 050 estava conceitualmente defensável e **errada na prática**. `classe_credito` continua gravada, mas agora só **rotula** a origem do abatimento: o KPI virou "Créditos" (total) mais "Dos quais, recuperações", e o badge da linha virou `RECUPERAÇÃO` em vez de `RECEITA`. Nenhuma migration nova — só mudou quem soma no cálculo.

### Card de gestão: frete × diária paga × diária emitida

**Pedido do Yves:** um card fácil de apresentar para a gestão com o custo mensal das diárias D01, as diárias emitidas (CTes de 100% de margem) e os fretes, cruzando o relatório de fretes (upload quase diário) com os débitos (que chegam no mês seguinte).

**O achado que estava no caminho:** a diária tem **dois documentos** e eles estavam em baldes errados.
- `D01`/`D05` — o que se **paga** ao motorista na hora. Estava certo (categoria `diaria`, saldo negativo).
- O CTe emitido depois **cobrando o cliente** — vinha no código de **frete**, com contrato zerado e margem 100%, somado junto com o frete de verdade. Isso **inflava a margem do frete** e escondia o custo real da diária. Depois da separação, a margem média do frete em 07/2026 caiu para **19,9%** reais.

O caminho que o app já previa para isso nunca foi usado: `tipo_doc='complementar'` (migration 048) tem **zero registros**, e `vl_cte_comp` está **zerado nas 1.043 viagens de 2026** — ou seja, o toggle "Incluir complementar (margem cheia)" do Resultado **não faz efeito nenhum hoje**. `diaria_rec` e `diaria_pg` pararam de ser preenchidos em 03/2026.

**Migration 051** (aplicada em produção 2026-08-06): categoria `diaria_emitida`. A régua foi calibrada nos 2.111 CTes de frete de 01–08/2026, não chutada:

| Sinal | Margem 100% | Frete normal |
|---|---:|---:|
| Total de casos | 243 | 1.868 |
| Sem nota fiscal | 96% | 1% |
| Valor redondo em centenas | 95% | 17% |

Mais um teto de R$ 5.000 — a maior diária **paga** em 8 meses foi R$ 3.600. Resultado: **226 reclassificados, 10 duvidosos para a fila** (via `flag_ambigua`, decisão humana), 6 seguem como frete. Linha com `categoria_manual = true` não é tocada.

**Na tela:** card no topo da Conferência. `Diária` virou `Diária paga` para não confundir com a emitida; a emitida ganhou o 6º KPI por categoria e aba própria no export.

O card abre com **a leitura do mês em uma frase** — "Em 07/2026 o frete deixou R$ 498.554,61 de saldo; a diária custou R$ 58.000,00 e voltou R$ 17.200,00 em CTe" — e a recuperação é dita em dinheiro, não em percentual: **"De cada R$ 100,00 de diária paga, voltaram R$ 67,25 em CTe"**. Os três blocos ficam abaixo como prova do número, não como o recado.

Os **duvidosos da régua** ganharam ação de um clique no modal da fila: `É diária emitida` reclassifica, marca `categoria_manual` e registra a decisão; `É frete — contrato faltando` fecha como revisado. Mesmo desenho do candidato de frota Rodorrica. Antes só dava para resolver entrando no modo edição admin.

**Toggle "Incluir complementar" parou de fingir.** Com `vl_cte_comp` zerado — o caso de hoje em toda a base — ligar ou desligar não mudava número nenhum. Agora aparece desabilitado, com o rótulo "Sem complementar lançado neste mês" e tooltip explicando; volta a funcionar sozinho no dia em que o campo tiver valor.

**O CTe da diária é emitido no mês seguinte ao pagamento**, então comparar pago × emitido dentro do mesmo mês mede o atraso, não a recuperação — julho isolado dá 30%. Por isso o card usa o acumulado dos 3 meses carregados. Nos 8 meses de 2026: pagou R$ 218.149,93, emitiu R$ 201.600,00 = **92%**.

### Ver só Belém: segmento de filial na aba Resultado

**Pergunta do Yves:** a planilha sobe com 3 abas (Açailândia, Belém, Imperatriz), mas o seletor de base junta "Imperatriz / Belém" — como ver os débitos só de Belém?

O split **já existia no Painel Financeiro** (segmento `Imp + Bel` · `Imperatriz` · `Belém`), só não na aba Resultado, que é onde se importa e se vê a lista lançamento a lançamento. Portado.

O recorte vale para o **P&L inteiro**, não só para a despesa: receita e pago-motorista saem da `origem` da viagem (`IMPERATRIZ-MA` / `BELEM-PA`), despesa sai da `aba_origem` (`IMP` / `BELÉM`). Filtrar só a despesa daria um "Resultado de Belém" com o faturamento das duas cidades dentro. Aplica em KPIs, lista, subtotais por grupo, modal de duplicidade e card de indevidas.

`origemBate()` saiu de `PainelFinanceiro.jsx` para `financeiroCalc.js` — as duas telas precisam recortar igual, senão o mesmo mês fecha diferente em duas abas do mesmo app.

**07/2026, conferido rodando os módulos reais contra a API:**

| | Viagens | Faturamento | Pago motorista | Margem | Despesa | Resultado |
|---|---:|---:|---:|---:|---:|---:|
| Imperatriz | 140 | R$ 1.285.390,67 | R$ 1.012.484,18 | R$ 272.906,49 | R$ 114.674,07 | **R$ 160.087,22** |
| Belém | 21 | R$ 43.040,00 | R$ 32.700,00 | R$ 10.340,00 | R$ 7.540,28 | **R$ 2.799,72** |
| Imp + Bel | 167 | R$ 1.330.531,67 | R$ 1.046.784,18 | R$ 283.747,49 | R$ 122.214,35 | **R$ 163.387,94** |

Belém fecha positivo: a linha "SALDO NEGATIVO MÊS 06/2026" (R$ 9.131,96) ficou de fora na importação, e o total da aba bate com os R$ 7.540,28 que a planilha declara.

**Viagem sem `origem` preenchida não entra em nenhum dos dois recortes** — em 07/2026 são 6 viagens (R$ 2.101,00 / margem R$ 501,00), então Imperatriz + Belém dá R$ 162.886,94 contra R$ 163.387,94 de "Imp + Bel". A legenda do recorte diz quantas são e quanto valem, em vez de sumir com elas em silêncio.

> Os números publicados aqui antes (134 viagens, R$ 1.233.910,67, resultado R$ 146.227,22) estavam **errados**: foram tirados de SQL direto na tabela, sem contar as cargas **sem-DT confirmadas**, que o App injeta no `DADOS` a partir de `controle_operacional_sem_dt` só nesta base (6 viagens em 07/2026, R$ 51.480,00 de CTe e R$ 37.620,00 de contrato).

### BUG DE PRODUÇÃO — faturamento dividido por ~1000 (achado pelo Yves)

Com o recorte de Imperatriz na tela, o card **Faturamento (CTE)** mostrou **R$ 1.285,35** para 140 viagens, e a Margem bruta ficou **− R$ 1.011.198,83 (−78670,8%)**. Não era do recorte por filial: é o **parsing do dinheiro**, e vinha de antes.

`nCte` era só `parseFloat(v)`, apostando no comentário *"vl_cte já vem decimal"*. Isso vale na AVB, mas **não** na `imperatriz_belem`, cujo sync grava pt-BR: `parseFloat("11.429,48")` devolve **11.429** — corta na vírgula e lê o ponto de milhar como decimal. Somando o mês, o faturamento sai dividido por ~1000. O `Pago motorista` vinha certo porque usa `nContrato`, que já tratava pt-BR — daí a margem gigantesca e negativa.

O valor certo é **R$ 1.285.390,67**: é literalmente o mesmo número com o separador de milhar comido.

Levantamento nas 1176 linhas da tabela: 964 pt-BR, 30 com ponto e sem vírgula (todas decimais reais, ex.: `2101.06`), 112 só dígitos, 70 vazias. Agora existe **um** parser (`nMoeda`, em `financeiroCalc.js`) que cobre os quatro casos; `nCte` e `nContrato` são apelidos dele, mantidos porque dizem de qual coluna vem cada valor.

**Telas afetadas, todas corrigidas:**
- Resultado, Painel Financeiro e Resumo (via `financeiroCalc`);
- **Dashboard** — `App.jsx` somava `parseFloat(r.vl_cte)` no faturamento por mês e no total do recorte: mesmo erro, mesma base;
- **Relatórios** — `relatorioEngine.js` usava `parseFloat` cru em `vl_cte`, `vl_contrato`, `adiant` e `saldo` (16 pontos).

**Segundo bug, independente, achado no caminho:** o bloco financeiro da AVB no Dashboard fazia `.replace(/[R$\s.]/g,"")`, que remove **todos** os pontos. Na AVB os valores são decimais (`435` de `464` linhas), então `"2101.06"` virava `210106` — Pago motorista, Adiantamento e Saldo da AVB inflados **100×**. Passou a usar o mesmo `nMoeda`.

Fica de fora, de propósito: `App.jsx:400` (`parseFloat(r.saldo)` no alerta de cobrança) tem o mesmo parsing, mas só testa `saldo > 0` e o sinal se preserva — o alerta acerta hoje. Não mexi.

### "Selecionar todas" no modal de linhas de outro mês
Pedido do Yves durante o teste: marcar tudo e ir desmarcando a exceção é mais rápido que clicar linha a linha. Mestre no topo da lista, com contador e estado indeterminado quando só parte está marcada.

### Bug de produção corrigido no caminho
`ModalDespesa` recusava salvar qualquer valor `<= 0` ("Informe um valor válido"), embora a própria função já calculasse `tipo='credito'` para negativo — na prática **nenhum crédito podia ser editado**. Passou a recusar só NaN e zero.

### Achados na planilha de julho, para conferir antes de importar
- **`belem` linha 2 — "SALDO NEGATIVO MÊS 06/2026" R$ 9.131,96** entra como despesa sem data e sem natureza (o texto está na coluna A, que o parser só usa para detectar seção). A planilha declara `TOTAL DE DESPESAS 7.540,28`; o app somaria R$ 16.672,24. Diferença = exatamente esses R$ 9.131,96.
- **`açai` linha 2 — salário da EDUARDA com `?` no lugar do valor** é descartado em silêncio, sem aviso.

---

## 2026-07-31 — Acesso do gestor: convite por e-mail, perfil Gestor e painel configurável

**Pedido do Yves:** dar ao gestor um link que abra só o Dashboard das 3 bases (Imperatriz, Maracanaú, Açailândia) + uma aba de Financeiro alimentada pelos relatórios que ele sobe, podendo escolher quais KPIs/painéis aparecem. E melhorar a tela "Gerenciar acessos", permitindo cadastrar o usuário primeiro e só depois decidir se é usuário de teste ou uma pré-aprovação por e-mail.

**Não precisou de app nem de link novo:** é a mesma URL. O que mudou foi como o acesso é concedido e o que a pessoa vê depois de entrar.

### 3 bugs de produção encontrados no caminho (todos corrigidos)
1. **`bases_permitidas` gravado como string JSON** (`"[\"imperatriz_belem\"]"`) em 2 usuários — `imperatriz@rodorrica.com.br` e `ocorrencias.ro@rodorrica.com.br`. O `_validar_token_e_base` testa com `@>`, que num escalar nunca casa: os dois levavam **"Acesso negado à base" em toda leitura**. Dado legado (o cliente atual manda array). Normalizado + `CHECK` pra não voltar.
2. **`ocimarnunes98@gmail.com` tinha acesso no Hub e nenhuma linha em `co_usuarios`** → nunca recebia token de sessão, o app abria vazio pra ele. Linha criada no backfill.
3. **Os chips de base da tela de acessos não valiam nada:** a tela só escrevia em `hub_user_modulos.config`, mas quem libera a leitura é `co_usuarios.bases_permitidas`. As duas fontes já tinham divergido em produção. Agora toda escrita passa por `hub_admin_set_acesso`, que grava nos dois lugares.

Também corrigido: o KPI **"Motoristas Ativos"** do dashboard apontava para `activeTab="motoristas"`, que **não existe** na lista de abas (é sub-seção de Cadastros) — clique levava a tela em branco pra qualquer usuário.

### Migration 047 — convites + espelho Hub→co_usuarios
- Tabela `hub_convites` (RLS ligada, **sem policy**: só as RPCs `SECURITY DEFINER` com gate `is_hub_admin()` tocam nela).
- `hub_admin_convidar(email, nome, modulos)`: se o e-mail já tem conta, aplica na hora; se não, guarda o convite. `handle_hub_new_user` (trigger em `auth.users`) consome o convite no **primeiro login** — a pessoa entra com o Google e já cai nas telas, sem fila de aprovação. O consumo é envolvido em `EXCEPTION` pra que um convite defeituoso nunca quebre o cadastro do usuário.
- `hub_admin_set_acesso` / `hub_admin_listar_convites` / `hub_admin_cancelar_convite`.
- Backfill **só aditivo**: onde Hub e `co_usuarios` divergiam, venceu a **união** das bases — tirar base de quem usa hoje seria efeito colateral silencioso.
- Verificado: fluxo convite→1º login→acesso aplicado testado numa transação com `ROLLBACK`; as 3 RPCs recusam `anon`; `hub_convites` devolve 0 linhas pro `anon`.

### Perfil "Gestor" e abas que faltavam travar
- Novo perfil `gestor`: Dashboard + Financeiro, sem editar nada.
- As abas **Buscar, Ocorrências, Relatórios, Operacional e Gestão não tinham `perm` nenhuma** — apareciam pra qualquer um, inclusive pra um visualizador. Ganharam chave. **Ninguém perde aba:** o filtro testa `perms[k] !== false`, e chave ausente segue visível.
- Cliques de KPI que levam a abas sem permissão agora não viram clique (antes: tela vazia).

### Financeiro do gestor
- Nova sub-aba **Resumo** (`views/ResumoFinanceiro.jsx`): faturamento, pago motorista, margem, despesas e resultado do mês, com sparkline de 6 meses e tabela do histórico. Usa `financeiroCalc` + `despesas_filial` — os mesmos números do Resultado, por construção.
- É a aba de entrada de quem não tem Planilha. **Créditos Pendentes** (tela de cobrança) sai por `perms.creditos`.

### Painel configurável por usuário (`config.dash`)
- `src/dashboardConfig.js`: catálogo de 10 KPIs e 11 blocos do dashboard, cada um com id estável.
- Toggles por usuário no Gerenciar acessos (e já na criação, importante no convite: a config viaja junto e é aplicada no 1º login). Só o que está **desligado** é gravado — usuário sem config nasce com o painel cheio.
- A lista respeita as features das bases do usuário: não oferece "Ranking por cliente" pra quem não tem base com essa feature.

### Consolidado das 3 bases
- Base virtual `BASE_TODAS` (`table: null` de propósito). `sincronizar` carrega uma base por vez e marca `_baseId` em cada linha; o token valida base a base, então ninguém vê o que não pode.
- **Leitura pura:** `canEdit` desligado e só Dashboard + Financeiro>Resumo disponíveis — as demais telas leem de uma tabela só.
- Bloco novo **"Por base"** no dashboard, com drill (clique abre a base).
- O Resumo agrupa por mês **e por base** antes de aplicar o complementar: a regra muda por operação (`complementarMargemZero` na AVB), então somar antes daria margem errada.

**Verificado:** build ✓, app carrega sem erro de console. **Não validado logado** (exige Google) — vale um passe no Gerenciar acessos e no consolidado após o deploy.

## 2026-07-29 — Dashboard unificado por feature (fim da tela exclusiva do AVB)

**Pergunta do Yves:** por que o dashboard do AVB é diferente dos outros?

**Resposta:** eram dois componentes. `App.jsx` roteava `acailandia_avb ? <DashboardAVB/> : <DashboardView/>`. Parte da diferença era legítima (AVB não tem DT nem diária), parte era só consequência de a tela ter sido escrita do zero: o AVB **não tinha** `CTE Médio/Viagem`, `Taxa Eficiência` e `Motoristas Ativos`, e ainda exibia a seção **"Status das DTs"** — rótulo de DT numa base que ancora por código.

**Implementado — um dashboard só, com cada KPI/bloco declarando a feature que exige:**
- Perfil ganhou `features.rastreamentoDocumental` e `features.rankingCliente` (ambas true só no AVB), ambas editáveis no Admin.
- `DTs Únicas` agora depende de `ancora === "dt"`; `Diárias a Pagar` de `features.diarias`.
- `Cargas Efetivadas` + `Taxa Documental` e o painel **Rastreamento Documental** (CTE/MDF/NF, barra de cobertura e lista de pendências) migraram para o dashboard padrão, gateados — qualquer operação documental pode ligar.
- **Pódio por cliente/contratante** portado com o mesmo visual, usando `rotuloCliente` no título ("Contratantes" no AVB, "Clientes" nos demais) e o campo certo (`contratante` × `cliente`).
- `Status das DTs` → `Status das Cargas` onde a âncora não é DT.
- `views/avb/DashboardAVB.jsx` e seu wrapper **removidos**; rota única.

**Resultado por base (verificado no navegador, com o app rodando):**

| | âncora | DTs Únicas | Diárias | Taxa Documental | Rastreamento | Ranking | Título do status |
|---|---|---|---|---|---|---|---|
| AVB | codigo | não | não | **sim** | **sim** | **Contratantes** | Status das Cargas |
| Imperatriz | dt | sim | sim | não | não | não | Status das DTs |
| Maracanaú | dt | sim | sim | não | não | não | Status das DTs |

**Verificado:** build ✓, ESLint `no-undef` zero no DashboardView, módulo carrega no navegador sem erro de console e o gating por base confere. **Não validado logado** (exige SSO) — vale um passe no dashboard das 3 bases após o deploy.

**Incidente durante o trabalho:** um script Python truncou o `DashboardView.jsx` (abriu em modo `w` e falhou ao escrever por causa de emoji em surrogate pair), zerando o arquivo. Restaurado do git e refeito. Passei a usar **escrita atômica** (grava em `.tmp` e só então substitui) — falha nunca mais destrói o original.

## 2026-07-29 — Regra de inatividade das embarcadoras (FOB + 15 dias)

**Pedido:** deixar desativado se for FOB (considerando só o cliente final) e se não tiver movimento em 15 dias.

**Risco encontrado antes de aplicar:** `useEmbarcadoras` montava o mapa `CNPJ → embarcadora` a partir da lista **filtrada por `ativo`** — e é esse mapa que a importação usa (`ConferenciaFrete` → `parseFreteXLSX` → `clienteEfetivo`). Desativar uma regra de devolução faria o CNPJ voltar a cair em **"não cadastrado"** no próximo arquivo, e a receita deixaria de ser roteada pro cliente final — o oposto do pedido. Corrigido primeiro: o mapa passa a usar **todas**, inclusive inativas. `ativo` controla o que aparece na tela, nunca como o arquivo é lido.

**Migration 046 (aplicada):**
- **Gatilho de reativação**: movimento novo reativa cliente comum automaticamente — contrapartida necessária da regra dos 15 dias, senão quem voltasse a rodar continuaria invisível. Regra de devolução **não** reativa, de propósito.
- **`desativar_embarcadoras_sem_movimento(dias := 15)`**: idempotente, não toca em devolução, não reativa ninguém. Rodável quando quiser.
- **Aplicado agora:** as 3 regras de devolução/FOB desativadas + `MARANHAO IND DE COUROS` (nunca teve CTe).

**Estado:** 3 ativas (SUZANO FAB IMPERATRIZ, AVB - ACAILANDIA, SUZANO FAB BELEM — todas com movimento de 1 dia atrás), 3 devoluções inativas, MARANHAO inativa.

**Testado** em transação com ROLLBACK: movimento novo reativa cliente comum ✓ e **não** reativa devolução ✓. Prod intacta (0 linhas de teste). Build ✓.

## 2026-07-29 — Conferência de Faturamento: cliente duplicado era CTe duplicado

**Relato:** "Por cliente" listava 7 clientes, com o mesmo cliente aparecendo duas vezes (Suzano Imperatriz + SUZANO FAB IMPERATRIZ, Suzano Belem + SUZANO FAB BELEM, AVB Acailandia + AVB - ACAILANDIA). Pedido: conciliar pelas embarcadoras cadastradas.

**O cadastro sempre esteve certo** — 1 linha por CNPJ. O histórico é que tinha dois textos para o mesmo CNPJ, e `resumoPorCliente` agrupa pelo TEXTO.

**CAUSA RAIZ (achada ao normalizar e bater na unique):** a chave era `unique (cliente, categoria, ctrc, periodo_ref)` — usava o **nome**, que é mutável, em vez do **CNPJ**. Quando a embarcadora foi renomeada no cadastro, a importação seguinte **não reconheceu os CTes já gravados e inseriu linhas novas**. Não era só rótulo: **7 CTes de 07/2026 estavam gravados em dobro, inflando o faturamento**. Qualquer renomeação futura repetiria isso, em silêncio.

**Migration 045 (aplicada):**
1. **Backup + remoção** das 7 duplicatas → tabela `frete_conferencia_removidas` (decisão do Yves: apagar com cópia). Conferido antes: os 7 pares são idênticos em placa/trecho/valor_nf/peso/frete/contrato/saldo — diferem só em `cliente` e `criado_em` (27/07 × 28/07). Zero casos ambíguos.
2. **SENDAS** vira regra de devolução apontando para Suzano Belém — o CTe dela já era `is_devolucao/FOB`, mas o cadastro dizia "cliente normal", por isso virava linha própria. Em devolução quem fatura é o destinatário.
3. **Chave única passa a ser por CNPJ** — fecha a duplicação na raiz.
4. **Normalização** do histórico: `cliente` = nome do cadastro (devolução usa o nome do cliente-alvo).
5. **Gatilho `trg_propagar_nome_embarcadora`**: renomear no cadastro atualiza o histórico, inclusive as linhas de devolução que faturam naquele nome. Testado em transação com ROLLBACK (2.092 linhas propagadas).

**Totais de 07/2026 — batem com a tela:**

| | CTRCs | Peso | Frete | Saldo |
|---|---|---|---|---|
| antes | 463 | 6.983.462 kg | R$ 2.802.623,25 | R$ 424.322,45 |
| **depois** | **456** | **6.792.669 kg** | **R$ 2.728.812,96** | **R$ 408.265,39** |
| backup | 7 | 190.793 kg | R$ 73.810,29 | R$ 16.057,06 |

"Por cliente" passou de 7 linhas para 3: SUZANO FAB IMPERATRIZ (304), AVB - ACAILANDIA (118), SUZANO FAB BELEM (34).

**Frota Pro — não é bug:** `viagens`, `motoristas`, `veiculos`, `clientes`, `conjuntos` e `carretas` estão com **0 registros** no projeto `fmkscmprtdqrpphqknte`. Só `despesas` (4.260) e `receitas` (562) foram importadas, via 13 `import_jobs`. Não existe schema `frota` — só `public`. A tela está correta ao dizer "nenhuma viagem": o módulo ainda não foi alimentado.

**Aberto:** `MARANHAO IND DE COUROS` está cadastrada e nunca teve CTe (0 registros) — decidir se desativa.

## 2026-07-29 — Verificação no navegador + Fase 6: campos extras por operação

### Smoke test do app rodando (1ª verificação real das 6 fases)

Subi o dev server e verifiquei o que build e teste de lógica não alcançam:

| Verificado | Resultado |
|---|---|
| App carrega, tela de login renderiza | ✓ zero erros no console |
| `rpc/listar_bases` do navegador, **sem login**, com anon key | ✓ 3 bases + `ordem` (campo que só existe no banco) |
| Efeito de boot roda sozinho | ✓ `getBase()` devolve a linha do banco, não a do código |

O 3º item revelou algo que merecia checagem: o objeto vindo do banco **não tem** `noDiarias`/`hasContratante`/`origemPadrao`/`agendaKmDia`, que existem em `BASES` (constants.js). Se algo ainda os lesse, o AVB regrediria (aba Diárias voltaria). Confirmado que **ninguém lê** — a Fase 1 já havia removido o único leitor. Sem regressão.

### Fase 6 — o terceiro eixo do diagnóstico inicial

Faltava o último eixo: **campos específicos da operação**. Features, vocabulário e classificador já eram configuráveis, mas os campos próprios (SGS, código, ganchos) ainda exigiam código.

- **`perfil.camposExtras`**: `[{k, l, type, secao}]` — campos que existem só naquela operação, injetados no modal de edição pela seção correspondente.
- **`ModalEdit`**: os dois blocos `...(isAvb ? [...] : [])` viraram `...extras("Agenda")` / `...extras("Operacional")`. **`isAvb` deixou de existir no arquivo.**
- **`ModalWhatsApp`**: os 5 usos de `isAvb` não eram campo extra — eram a **âncora** do registro (código × DT), que o perfil já modelava. Agora `getPerfil(base).ancora === "codigo"`. Mesmo comportamento, sem citar a base.
- **Admin**: editor de campos extras (`coluna|Rótulo|tipo|Seção`, um por linha), com aviso de que a coluna precisa existir na tabela.
- **`co_bases`**: perfil do AVB atualizado com os 3 campos.

**Testado:** ida-e-volta do formulário **lossless** com o campo novo; campos chegam ao modal na seção certa; Imperatriz e Maracanaú seguem com zero campos extras; transportadora nova declara os seus (`num_container`, `data_embarque`) pelo Admin. Confirmado no navegador com o app rodando: o perfil do AVB chega do banco com os `camposExtras`. Build ✓, ESLint `no-undef` limpo.

**Refs hardcoded a id de base: 64 → 30.**

### Bug pré-existente corrigido (não relacionado às fases)

`ModalWhatsApp.jsx` usava `saveJSON` sem importar — só `clickable` vinha de `utils.js`. Enviar documento pelo WhatsApp **com OBS preenchida e marcada para incluir** disparava `ReferenceError` e quebrava o envio. O build nunca pegaria isso (Vite não valida variável indefinida); apareceu no ESLint. Corrigido adicionando ao import — mudança de uma palavra, fácil de reverter se preferir tratar à parte.

## 2026-07-29 — Fase 4b (tela no Admin) + Fase 5 (classificador genérico)

### Fase 4b — Admin › Bases / Operações

Seção nova e colapsável no Admin (`src/views/admin/BasesOperacao.jsx`, componente próprio para não engordar o `AdminView`, que já tinha 682 linhas). Lista as bases de `co_bases` e edita: identificação (id/nome/tabela/ordem), **funcionalidades** (um `Toggle` por feature), rótulos e vocabulário (âncora DT/Código, como chamar quem paga, motor de alertas, origens válidas), financeiro e o classificador. Botão **+ Nova base** cadastra uma transportadora do zero — sem deploy.

A UI é **data-driven**: `FEATURES_META` e `ALERTAS_OPCOES` moram em `operacao/perfil.js`, ao lado da definição. Feature nova aparece na tela sozinha, sem editar o formulário.

**Só grava o que diverge do padrão** — campo deixado no valor padrão não vai pro banco, para não congelar lá um default que amanhã pode mudar no código.

**Lógica pura extraída para `operacao/basesForm.js`** (`formDaBase`/`perfilDoForm`), porque o risco desta tela é silencioso: se a ida-e-volta perdesse um campo, abrir e salvar uma base apagaria configuração sem ninguém notar. Separada assim, deu para testar sem navegador — **ida-e-volta é lossless nas 3 bases reais**, e base sem alteração gera `{}`.

### Fase 5 — o classificador deixou de ser "papel × celulose"

- **`PlanilhaView`**: o chip fixo `Celulose` virou o rótulo do classificador da operação — aparece só no valor **não-padrão** (marcar toda linha com o valor comum seria ruído).
- **`CargasSemDt`**: os 2 chips e o `<select>` Papel/Celulose passaram a vir do classificador (recebido via ctx).
- **`ModalEdit`**: **campo novo** para marcar o classificador no registro. Antes só o sync da planilha conseguia definir o tipo — uma base nova não teria como separar "padrão" de "exportação" pelo próprio app. Persiste sem tocar na RPC: o `upsert_operacional` usa `jsonb_populate_record`, que mapeia só colunas reais.

**Testado:** Imperatriz mantém o comportamento de hoje (chip só em celulose, opções papel/celulose); AVB e Maracanaú seguem sem classificador (nenhum chip, nenhum campo extra); e a base `ferro_exportacao`, cadastrada **só pelo Admin**, ganha seletor "Padrão | Exportação", chip em Exportação e o título "Tipo de operação". Build ✓ e ESLint `no-undef` zero nos arquivos tocados.

**Sobrou hardcoded:** 4 menções a "celulose" — todas **comentários** de exemplo, nenhuma lógica. Refs a id de base: **32** (`ModalEdit`/`ModalWhatsApp` com campos específicos do AVB, escolha das telas AVB no `App.jsx`, `despesas.js` e defaults de bootstrap).

## 2026-07-29 — Fase 4a: o Perfil de Operação passa a vir do banco

**Objetivo:** ajustar uma operação — ou cadastrar uma transportadora nova — **sem deploy**.

**Migrations 043 + 044 (aplicadas):**
- Tabela **`co_bases`** (`id`, `label`, `tabela`, `perfil jsonb`, `ordem`, `ativo`), RLS ligada e **sem policy** — anon não lê a tabela direto, só pelas RPCs (padrão das migrations 023/025/031/037).
- **`salvar_base(p_token, p_id, p_dados)`** — gate `perfil='admin'`, mesmo do `editar_frete` (036).
- **`listar_bases()`** — **sem token de propósito**: o mapeamento `id → base` acontece no login e no Hub, *antes* de existir sessão (o token é o resultado do login). Exigir token ali inviabilizaria a fase inteira. O conteúdo é o mesmo que já viaja no bundle público (`constants.js BASES`) — nenhum dado operacional, pessoal ou financeiro.
- Seed com as 3 bases atuais, refletindo `constants.js` + `operacao/perfil.js`.

**Front:**
- **`src/operacao/bases.js`** (novo): `carregarBases(conn)` no boot, `getBase(id)` / `getTodasBases()` (banco vence, código é fallback) e `salvarBase()`.
- **`operacao/perfil.js`**: camada `setPerfisRemotos()` — precedência **PADRÃO → POR_BASE (código) → banco**, merge por seção (desligar uma feature no banco não apaga as outras).
- **`App.jsx`**: carga no boot (best-effort, `.catch(() => {})`) + `basesVersao` nas deps do `perfilAtual`, porque o perfil pode chegar do banco **depois** do primeiro render.
- **`useAuthHandlers.js` / `HubScreen.jsx`**: `BASES[id]` → `getBase(id)`, para base cadastrada sem deploy aparecer já no login.

**Testado:**
- RPCs, com usuário de teste temporário e `ROLLBACK` (nunca com token real — lição da migration 034): ler sem token → barrado; operador gravar → barrado; token falso gravar → barrado; admin criar → ok; base nova aparece na listagem. Prod intacta.
- **Seed é neutro:** comparação profunda (ignorando ordem de chave do `jsonb`) provou perfil do banco **idêntico** ao do código nas 3 bases — zero mudança de comportamento.
- Base nova só no banco (`zz_ferro`, sem existir em `constants.js`) recebe perfil completo: seletor "Padrão / Exportação", aba Diárias oculta, vocabulário herdado do padrão.
- Build ✓. Não validado em navegador (exige login SSO).

**Falta a Fase 4b:** tela no Admin para editar isso sem SQL. Hoje a edição é via `salvar_base` (SQL/MCP).

## 2026-07-29 — Duplicação fechada (gatilho) + Fase 3: ramos AVB mortos nas views padrão

### Duplicação do motorista — fechada com gatilho (opção "c")

Avaliadas 3 saídas com o Yves; escolhida a **(c)**. As descartadas e o porquê estão no cabeçalho da migration. Resumo: (a) o `.gs` parar de enviar limparia o schema, mas **304 dos 430 registros AVB têm telefone** — a planilha *é* a entrada de verdade, e cortá-la mudaria a rotina de quem opera; (b) o `.gs` gravar direto em `motoristas` exigiria uma RPC chamável com a **anon key** (que está no bundle público) escrevendo dados bancários — reabrir a classe de buraco que a auditoria fechou.

**Migration 042 (aplicada):** gatilho `trg_promover_dados_motorista_avb` em `controle_operacional_avb` promove telefone/banco/agência/conta/PIX/favorecido para o cadastro `motoristas` casando por CPF. **Só preenche o que está vazio** — o que foi editado no app nunca é sobrescrito pela planilha. O `SyncSupabase_AVB.gs` **não muda** (zero risco de repetir os 3 aborts do lockdown). Guarda no `WHERE` evita reescrever as mesmas linhas a cada sync. Testado em transação com ROLLBACK: campo já preenchido preservado, resto veio da planilha, `pix_tipo` inferido como CPF; prod intacta (0 linhas de teste).

*Não tratado de propósito:* 40 CPFs do AVB sem cadastro em `motoristas` — o gatilho completa cadastro existente, não cria (criar motorista a partir de linha de viagem é decisão de produto).

### Fase 3 — o diagnóstico anterior estava errado

Eu havia registrado "1.364 linhas duplicadas em `views/avb/*`". **Não procede:** `DashboardAVB` (rastreamento documental CTE/MDF/NF), `LogisticaAVB` (cargas em trânsito) e `GestaoAVB` (fluxo Homérico → Gerenciadora → Fortes → NF → ADT) são telas *distintas* de uma operação distinta — fundi-las seria forçar telas sem relação.

A duplicação real era outra: **os ramos AVB abandonados dentro das views padrão**, restos de quando as telas AVB foram extraídas. `App.jsx` roteia `baseAtual?.id === "acailandia_avb" ? <XAVB/> : <XPadrão/>`, então dentro de `PlanilhaView`/`DescargaView` a condição AVB é **sempre falsa**:

- **`DescargaView.jsx`**: bloco `if (baseAtual?.id === "acailandia_avb")` de **162 linhas**, inalcançável — removido (+ import órfão de `utils_avb`, `baseAtual`/`DADOS` do ctx).
- **`PlanilhaView.jsx`**: `COLS_AVB`, `parseYMfiltAvb`, `isAvb` e seus 11 usos (filtros de contratante/gerenciadora, busca expandida, chip de placa) — removidos. Os setters seguem no botão "limpar filtros".

**Bug latente encontrado no caminho:** `PlanilhaView.COLS_AVB` declarava a coluna `gerenciadora`, que **não existe** em `controle_operacional_avb` (a coluna é `gerenc`) — duas definições divergentes das colunas do AVB, uma delas apontando para campo inexistente. Sumiu junto.

**Total: −268 linhas.** Refs hardcoded a id de base: **64 → 31**.

**Verificado:** build ✓ + ESLint `no-undef` **zero** nas duas views (o build sozinho não pegaria — a primeira passada deixou `matchAvb`/`isAvb` pendurados, que dariam ReferenceError em runtime; corrigidos antes de fechar). Órfãos restantes (`activeCols`, `t`, `isMobile`, `toggleSort`, `DESIGN`, `showToast`, `motoristas`, `parseData`, `diffDias`) foram conferidos contra a versão do git e **já existiam antes** — não mexi, conforme a regra de não remover código morto pré-existente.

## 2026-07-29 — Duplicação de dados do motorista + Fase 2 do Perfil de Operação

### Duplicação corrigida (dados de pagamento do motorista)

**Achado:** `controle_operacional_avb` guardava cópias POR VIAGEM de `banco/agencia/conta/chave_pix/cpf_cnpj/favorecido/telefone` (escritas pelo `SyncSupabase_AVB.gs`), enquanto o cadastro `motoristas` — o lugar canônico, e o único que o app lê — estava com esses campos NULOS. A mensagem de pagamento do WhatsApp mostrava "—" para dados que existiam no banco. Pior: `ModalMotorista` e `ModalWhatsApp` já referenciavam `pix_tipo`/`pix_chave`, colunas que **nunca existiram** — o cadastro salvava tudo menos o PIX, em silêncio.

**Implementado — migration 041 (aplicada em prod):**
- `motoristas` ganhou `pix_tipo` + `pix_chave` (nomes que o código já esperava);
- whitelists das RPCs `criar_motorista`/`atualizar_motorista` atualizadas — sem isso o PIX se perderia ao salvar;
- **backfill** do que estava preso na tabela de viagens, sem sobrescrever nada já preenchido: telefone **1 → 184**, banco 1 → 9, conta 0 → 6, PIX 0 → 7 (de 849 motoristas). `pix_tipo` inferido (chave == CPF → CPF; 10/11 dígitos → Telefone) e conferido nos 7 casos;
- `useMotoristas.js`: `CAMPOS_MOTORISTA` += `pix_tipo`/`pix_chave`.

**PENDENTE (não aplicado):** `supabase/migrations/042_drop_dados_bancarios_avb.sql.PENDENTE` derruba as cópias da tabela de viagens — **só depois** de o `SyncSupabase_AVB.gs` parar de enviá-las, senão o sync quebra com 400 (mesma armadilha dos 3 aborts do lockdown). Decisão do Yves: (a) o .gs para de enviar e o cadastro do app vira a entrada, ou (b) o .gs passa a fazer upsert em `motoristas` por CPF.

### Fase 2 — alertas, financeiro e portões de tela pelo perfil

- **`operacao/perfil.js`**: + `features.filialNasDespesas`, `financeiro.incluirComplementarPadrao`, `financeiro.filialDespesas`.
- **`financeiroCalc.js`**: a regra do complementar (margem zero × margem cheia) vem de `financeiro.complementarMargemZero`, não de `baseId === "acailandia_avb"`.
- **`App.jsx`**: motor de alertas por `perfil.alertas`; alertas de descarga atrasada e cobrança de saldo gateados por feature; fila sem-DT por `features.semDt`; **filtro de tipo de carga agora é genérico** — lê `perfil.classificador` (campo/padrão/valores), então o seletor do topbar deixa de ser "Papel/Celulose" fixo e passa a ser o que a operação declarar.
- **`FinanceiroView` / `PainelFinanceiro` / `Resultado` / `DashboardView`**: default do toggle de complementar, filtro de filial, rótulo "(margem zero)/(margem cheia)", filial dos créditos e KPI "Sem DT" — todos pelo perfil.

**Resultado:** referências hardcoded a id de base caíram de **64 → 35** (fora `constants.js`/`perfil.js`). O que sobra é Fase 3 (escolha de views AVB), `useDTHandlers` (âncora dt/código), `despesas.js` (mapa de siglas) e defaults de bootstrap.

**Testado:** build ✓ (exit 0) + teste de lógica nas 3 bases — margem do complementar (AVB 200 × padrão 300), motor de alertas, portões e opções do classificador idênticos ao comportamento anterior. Não validado em navegador (exige login SSO).

## 2026-07-29 — App genérico · Fase 1: Perfil de Operação

**Solicitado:** tornar o app utilizável por qualquer transportadora — hoje as diferenças entre operações (AVB não tem diária/SGS/descarga agendada; Suzano tem papel×celulose; cada base tem origens próprias) estão cravadas no código como `if (baseAtual?.id === "...")`.

**Diagnóstico:** 64 referências literais a ids de base em 19 arquivos; 3 tabelas quase gêmeas (58 colunas em comum, AVB +14, Imperatriz +2); fork de UI em `src/views/avb/*` (1.364 linhas); enums de vocabulário fixos em `validators.js`. O embrião da solução já existia em `BASES` (`noDiarias`/`hasContratante`/`origemPadrao`), mas só `noDiarias` chegou a ser lido.

**Implementado:**
- **`src/operacao/perfil.js`** (novo): descreve cada base como DADO — `ancora` (dt/código), `rotuloCliente`, `features` (diarias, descargaAgendada, cobrancaSaldo, sgs, operacional, gestao, semDt, classificadores), `vocab` (status/vinculo/roStatus/origem), `financeiro.complementarMargemZero`, `alertas` e `classificador`. Formato JSON puro, para virar tabela `co_bases` na Fase 4 sem reescrita.
- **`src/validators.js`**: enums deixam de ser constantes fixas e vêm do perfil (`validarRegistroOperacional(reg, baseId)`); lista vazia = campo livre.
- **`src/hooks/useDTHandlers.js`**: passa `baseAtual?.id` na validação.
- **`src/App.jsx`**: `perfilAtual` (useMemo) e as tabs passam a declarar a feature que exigem (`feat:"diarias"|"operacional"|"gestao"`) — os 3 filtros que citavam `acailandia_avb` viraram um só, por feature.

**BUG CORRIGIDO de quebra:** `ORIGEM_OPTS` fixo (`IMPERATRIZ-MA`/`BELEM-PA`) valia para TODAS as bases exceto AVB — Maracanaú tem 411 registros em `MARACANAU-CE`, então **salvar/editar qualquer registro de Maracanaú pelo app falhava** com `"origem" inválido`. Agora cada base tem seu vocabulário (Imperatriz mantém o enum fechado; Maracanaú e AVB ficam livres).

**Testado:** build ✓ (exit 0) + teste de lógica das 3 bases — tabs idênticas ao comportamento anterior, origem real de cada base aceita, Imperatriz ainda barra origem estranha, status inválido ainda barra. Não validado em navegador (exige login SSO).

**Próximas fases:** 2) alertas/financeiro/rótulos pelo perfil · 3) fundir `views/avb/*` com as padrão · 4) perfil → tabela `co_bases` editável no Admin · 5) classificadores genéricos (ferro×exportação) substituindo `tipo_carga`.

## 2026-07-29 — Fix: race condition em gerar_token_sessao causava "Sessão inválida ou expirada"

**Sintoma:** Yves relatou erro ao abrir um módulo/selecionar base — toast "HTTP 400 P0001 Sessão inválida ou expirada" repetido. Diagnosticado via Supabase MCP (SQL live + API log): usuário tinha token válido no banco, mas o front usava um token diferente.

**Causa:** `gerar_token_sessao` (migration 034) fazia SELECT→IF→UPDATE em passos separados, não atômico. O bootstrap SSO do App.jsx disparou 3 chamadas concorrentes em ~37ms (visto no API log); cada uma gerou seu próprio UUID e gravou por cima da anterior — o front ficou com o token de uma chamada "perdedora", que não batia mais com o banco. Toda leitura via RPC (`listar_operacional`, `listar_motoristas`, `listar_veiculos`, `listar_despesas`) passava a falhar até recarregar (podendo repetir a corrida no reload seguinte).

**Fix (migration 040, aplicada em prod):** reescrita como `UPDATE ... RETURNING` atômico — o lock de linha do Postgres serializa chamadas concorrentes, então todas devolvem o mesmo token final. Testado (3 chamadas simultâneas via SQL → mesmo token, batendo com o banco). Não mexe em RLS/policies nem em front-end.

## 2026-07-23 — Edição admin do CTe: FOB troca o pagador p/ o destinatário

**Solicitado:** Ao marcar um CTe como FOB, o pagador (cliente) deixa de ser o remetente e passa a ser o destinatário (ex.: SENDAS que na verdade é Suzano Belem) — o cliente/base devem atualizar.

**Implementado (`src/views/ConferenciaFrete.jsx`):** no form de edição admin, o campo **Cliente (pagador)** virou um seletor (datalist) das embarcadoras que faturam (têm base_id) — escolher já traz a **base** junto (mesma lógica do import de devolução). Adicionado seletor de **Base** e, quando Modalidade=FOB, uma **nota** lembrando que o pagador é o destinatário. `base_id` entra no patch (whitelist da RPC editar_frete já cobre). Aceita digitar cliente livre também.

**Build:** ✓ (exit 0).

## 2026-07-23 — Fase C: despesas_filial CRUD via RPC token-validada (dual-path)

**Implementado:**
- **Migration 037** (aplicada, aditiva): 8 RPCs SECURITY DEFINER token-validadas — `listar_despesas` (base+mês / base toda), `listar_meses_despesas`, `listar_indevidas_despesas` (base/global), `listar_creditos_despesas`, `inserir_despesas_lote` (import/manual), `atualizar_despesa` (patch dinâmico: edição + indevida/crédito/cobrança), `excluir_despesa`, `excluir_despesas` (lote). REVOKE public + GRANT anon.
- **`src/despesas.js`**: dual-path (RPC c/ token, senão anon), `setDespesasToken()`. Todas as ~13 funções de I/O convertidas; assinaturas inalteradas.
- **`src/App.jsx`**: `setDespesasToken(sessionToken)` no efeito `[sessionToken]`.
- **Migration 038** (go-live) PRONTA, **não aplicada** (aguarda deploy + prova no API log).

**Testado (banco, usuário de teste temporário):** reads = 343 (base) / 4 meses / 74 créditos; ciclo insert→patch(indevida+cobrança+crédito null)→excluir_despesas OK; dados de teste apagados. Nenhum acesso direto à tabela fora de `despesas.js`.

**Build:** ✓ (exit 0). Go-live (038) pendente.

## 2026-07-23 — Lockdown FECHADO (mig 035) + Fase 2: edição admin de CTe

**Lockdown (3ª tentativa, sem incidente):** migration **035** refez 030 (core read) + 032 (frete). Provado ANTES (API log: navegador do Yves em `POST /rpc/listar_operacional`; banco `listar_frete`=368 c/ token dele; setFreteToken usa o mesmo sessionToken). Provado DEPOIS: anon=0 (core 3 bases + frete), RPC=1073/368. CPF/financeiro do core + conferência só via RPC token-validada.

**Fase 2 — edição admin do CTe (modal):**
- **Migration 036** (aplicada): `editar_frete(p_token,p_id,p_patch)` SECURITY DEFINER, gate `perfil='admin'` pelo token, whitelist dinâmica c/ cast por tipo. Testado com usuários de teste temporários (admin edita / operador bloqueado; dados apagados).
- **`src/freteConferencia.js`**: `editarFrete()` (dual-path) + `recalcularLinhaEditada()` (margem+flags de 1 linha, menos duplicidade).
- **`src/App.jsx`**: `perfil` no ctx do FinanceiroView.
- **`src/views/ConferenciaFrete.jsx`**: botão **✎ Editar** no modal (só admin) → formulário (cliente, categoria, modalidade CIF/FOB, CTRC, empresa, placa, data, trecho, NFS, valores). Ao salvar: recalcula margem/flags, grava via RPC, recarrega. Ex. de uso: SENDAS que é FOB e subiu como CIF.

**Build:** ✓ (exit 0).

## 2026-07-23 — 3ª tentativa (prep): SSO/Hub sem token era a causa raiz REAL

**Descoberta (Supabase API log, pós-F5 do Yves):** a sessão dele fazia TUDO por GET anon — nenhuma RPC, nenhuma chamada a `gerar_token_sessao`. Causa: o bootstrap SSO do Hub (`App.jsx:574`) só faz `setAuthed(true)`; quem entra pelo Hub nunca ganha `sessionToken`. Agravante: `yvesfg@gmail.com` nem existia no `co_usuarios`. Evidência antiga passou despercebida: dashboard mostrando "6 de **0 cadastrados**" (motoristas via GET vazio desde a 027 nas sessões SSO).

**Implementado:**
- **Migration 034** (aplicada): cria `co_usuarios` do Yves (admin, 3 bases, senha-hash aleatória) + `gerar_token_sessao` agora **reusa** token vigente (>1h restante) em vez de rotacionar — acaba a guerra de token entre abas/dispositivos.
- **`src/App.jsx`**: bootstrap SSO gera o token (`gerar_token_sessao(email do SSO)`, guardado por `sessionTokenRef`); best-effort p/ e-mails fora do `co_usuarios`.
- Provado no banco: reuso ok; RPCs core=1071 / frete=368 com o token do Yves.

**Build:** ✓. Lockdown (035) SÓ depois de: deploy → Yves recarrega → API log mostrar `rpc/listar_operacional`/`rpc/listar_frete_*` na sessão dele.

**Achado paralelo no log (fora do escopo de hoje):** o `SyncSupabase.gs` do **Maracanaú** está tomando **401** no `POST /controle_operacional_maracanau?on_conflict=dt` (apikey errada/antiga no Script Properties?) e um outro script manda `co_config?on_conflict=key` (coluna certa é `chave`) → 400. A planilha do Maracanaú NÃO está sincronizando.

## 2026-07-23 — INCIDENTE #2: lockdown 035 quebrou o UPSERT do .gs nas 3 bases → rollback 039

**Sintoma:** Yves reportou achar que tinha apagado o script funcional do Maracanaú; ao reconstruir e testar (`SyncSupabase_Maracanau.gs` novo), o sync continuava tomando 401 com `"new row violates row-level security policy"` mesmo usando a anon key correta e confirmada.

**Investigação:** reproduzi a chamada exata do `.gs` com `curl` — mesmo erro, `SQLSTATE 42501`, tanto no Maracanaú quanto (teste de controle) no **core (`controle_operacional`)**. Ou seja: não era script errado, não era chave errada — era a migration **035** (o read-lockdown "bem-sucedido" de hoje cedo) quebrando os 3 syncs.

**Causa raiz:** o `.gs` grava via `UPSERT` (`?on_conflict=dt`). Postgres precisa de uma policy de **SELECT** pro papel executor conseguir resolver `ON CONFLICT DO UPDATE` — mesmo em linha nova. Sem SELECT anon (que a 035 derrubou nas 3 bases), todo upsert falha com RLS violation, independente de INSERT/UPDATE estarem corretos. **Fase A (read) e Fase B (write via RPC) não são independentes enquanto o `.gs` usar UPSERT direto** — essa é a lição que faltava nas 2 tentativas anteriores.

**Correção:** migration **039** restaura SELECT anon nas 3 bases (core). Verificado com curl direto: upsert em `controle_operacional` e `controle_operacional_maracanau` = 201 (antes: 401). Dados de teste (`__CURL_TEST*__`, `__WRITE_TEST__`) limpos.

**Script do Maracanaú:** reconstruído (`SyncSupabase_Maracanau.gs`, molde do core adaptado ao schema real — chave `dt`, sem fila sem_dt) e enviado ao Yves — ele estava correto o tempo todo; o 401 era só efeito da 035. Deve voltar a sincronizar no próximo ciclo agora que a 039 restaurou o SELECT.

**Duração do impacto:** as 3 bases ficaram sem sincronizar por ~1h (desde a aplicação da 035 até a 039).

## 2026-07-23 — INCIDENTE: app sem dados em prod → rollback 033 (desfaz 030 + 032)

**Sintoma:** dashboard, planilha e conferência vazios em prod (badge ONLINE, dados zerados).

**Causas (somadas):**
1. Os testes das RPCs no banco chamaram `gerar_token_sessao('admin@sistema')` várias vezes — a função **rotaciona** o token (UPDATE em `co_usuarios.session_token`), derrubando a sessão viva do navegador do Yves. Com a 030 ativa, o path RPC falhava ('Sessão inválida') e o GET anon voltava vazio.
2. A 032 foi aplicada com o front antigo no ar: o dual-path de `freteConferencia.js` só subiu no commit `a086109` (10:45), DEPOIS da confirmação do Yves (feita com policies abertas → GET mascarado).

**Correção:** migration **033** reabriu as policies (core 3 bases + frete_conferencia 4). Provado: anon lê 1071/417/371 + 3192. F5 no app normaliza (auto-login regenera o token).

**Lições (antes da próxima tentativa):** testar RPC com usuário de teste (nunca rotacionar token de usuário real); provar pelo Supabase API log que o app deployado chama `rpc/...` antes de derrubar policy; confirmação visual com policy aberta não prova o path RPC.

## 2026-07-23 — Conferência de Frete: CTes clicáveis + bloco por cliente (Fase 1)

**Solicitado:** Sinalizados e Revisados clicáveis (abrir modal pra ver/editar a decisão); e clicar num cliente em "Por cliente" abrir um bloco novo com os CTes daquele cliente, clicáveis/editáveis via o modal existente. (Edição completa de valores = só admin — planejada pra Fase 2.)

**Implementado (Fase 1 — reusa o modal e as RPCs já no ar, sem novo backend):**
- **`src/views/ConferenciaFrete.jsx`**:
  - Linhas de **Sinalizados** e **Revisados** agora clicáveis → abrem o modal (`abrirRevisar`); botões internos ("Resolução feita"/"Estornar") com `stopPropagation`.
  - Modal ganhou **painel da decisão** (rótulo + quem/quando/obs) quando o item já foi decidido, e botão **↩ Estornar decisão** no rodapé.
  - Novo bloco **"CTes · {cliente}"** que aparece ao selecionar um cliente em "Por cliente": resumo (qtd + saldo) + lista de CTes clicáveis (data/placa/flags/decisão) → abrem o mesmo modal. Botão "limpar ✕".

**Build:** ✓ (exit 0).

**Fase 2 (planejada):** edição COMPLETA de CTe só pra admin (ex.: corrigir FOB/CIF, categoria, valores) — nova RPC `editar_frete` admin-gated + campos editáveis no modal (requer `perfil` no ctx do FinanceiroView).

## 2026-07-23 — V2 Fase C (frete_conferencia): CRUD via RPC token-validada (dual-path)

**Solicitado:** Seguir o lockdown para a Fase C (tabelas app-only), começando por `frete_conferencia` (financeiro, prioridade do plano).

**Implementado:**
- **`supabase/migrations/031_frete_conferencia_rpcs.sql`** (aplicada em prod, aditiva) — 6 RPCs SECURITY DEFINER token-validadas (`_validar_token_e_base`) que consolidam as 10 funções de acesso: `listar_frete_periodos` (período/períodos/todos), `listar_frete_pendentes` (corte do mês anterior calc. no SQL), `listar_frete_sinalizados`, `inserir_frete_lote` (insert em bloco c/ casts numeric/date/boolean + defaults id/criado_em/origem), `patch_frete` (decidir + estornar), `excluir_frete`. REVOKE public + GRANT anon.
- **`src/freteConferencia.js`** — dual-path (molde motoristas): `setFreteToken()` + rota RPC quando há token, senão REST anon. As 9 funções de I/O convertidas; assinaturas públicas inalteradas (views não mudam).
- **`src/App.jsx`** — `setFreteToken(sessionToken)` no efeito `[sessionToken]` (ao lado de motoristas/veículos).
- **`supabase/migrations/032_golive_drop_policies_frete_conferencia.sql`** — go-live PRONTA, **não aplicada** (drop das 4 policies anon; aguarda deploy + confirmação no navegador).

**Testado (banco, RPCs, policies ainda abertas):** reads com token = 368/103/1 (período 2026-07/pendentes/sinalizados); insert→patch(decidir)→estorno→delete OK (casts e timestamptz validados, linha de teste auto-removida); token inválido rejeitado. Nenhum acesso direto à tabela fora do domínio.

**Build:** ✓ (exit 0). **Go-live FEITO (migration 032, após deploy + teste OK por Yves):** anon = 0 policies (bloqueado); RPC c/ token = 368. frete_conferencia fechada.

## 2026-07-23 — V2 Fase A (re-tentativa): fix da causa raiz do timing de token

**Solicitado:** Verificar se está tudo certo e continuar o lockdown conforme `PLANO_V2_CONTINUACAO.md` (a Fase A foi tentada na 028 e revertida na 029 por dashboard vazio).

**Diagnóstico (causa raiz do abort da 028):** o `sincronizar` (`src/hooks/useSyncHandlers.js`) estava memoizado com deps `[getConexao, dadosExtras, showToast]` — **sem `sessionToken` nem `baseAtual`**. Os efeitos de re-sync (`App.jsx:506` `[authed, sessionToken]`) e de troca de base (`App.jsx:140` `[baseAtual]`) re-disparavam, mas chamavam o MESMO closure velho que congelava `sessionToken=null`. Enquanto as policies estão abertas isso fica mascarado (o GET anon usa `tblRef.current`, sempre correto); no instante do lockdown o path RPC passa a valer e usa token/base velhos → dashboard vazio.

**Implementado:**
- **`src/hooks/useSyncHandlers.js`** — deps do `sincronizar` agora `[getConexao, dadosExtras, showToast, sessionToken, baseAtual]`. Path RPC passa a usar token/base frescos assim que chegam. Uma linha, cirúrgico, sem loop (ambos só mudam em login/troca de base).
- **`docs/PLANO_V2_CONTINUACAO.md`** — passo 1 reescrito (causa raiz + fix real); prova no banco registrada.

**Go-live (após deploy do fix + confirmação no navegador por Yves — dashboard e troca de base OK):**
migration **030** aplicada. Prova: anon SELECT = **0** nas 3 bases; RPC c/ token = **1071 / 417 / 371**
(imperatriz/avb/maracanau); INSERT/UPDATE anon **intactos** (o `SyncSupabase.gs` segue escrevendo).
CPF/financeiro do core agora só saem via RPC token-validada. Fase A CONCLUÍDA.

**Build:** ✓ (exit 0).

## 2026-06-23 — Diagnóstico geral + correção do tema claro + perfil CRLV

**Solicitado:** Análise completa (IA atual, app Consulta ANTT no GitHub, viabilidade Gemini vs alternativa gratuita), correção da ilegibilidade do tema claro (img2), redesign do modal de detalhe (img1) e fluxo reutilizável de extração de documentos (CRLV).

**Diagnóstico:**
- **IA atual:** funcional. Núcleo em `api/_ai/{provider,profiles,engine}.js` + endpoint `api/ai-extract.js`. Gateway central `yf-ai-gateway` publicado e testado (retornou JSON correto). Provedor = Gemini, troca em 1 arquivo.
- **Consulta ANTT:** **não existe neste repositório.** Aparece só como *tile* no Hub (`HubScreen.jsx`, slug `antt`, descrição "RNTRC · CIOT · Rastreio"); ao clicar cai em `showToast("⏳ Módulo em breve")`. Não é dessincronização de código — o app simplesmente ainda não foi criado.

**Implementado:**
- **`src/views/PlanilhaView.jsx`** — correção da ilegibilidade no tema claro: as linhas usavam cores hardcoded do tema escuro (`rgba(255,255,255,.75)` no nome, `rgba(255,255,255,.4)` na rota, pastéis `#86efac/#a5b4fc/...` nos KPIs) — invisíveis sobre fundo branco. Trocadas por tokens semânticos (`var(--text)`, `var(--text3)`, `var(--green)`, `var(--red)`, `var(--color-info)`, `var(--accent)`) que adaptam aos dois temas.
- **`src/design-system/theme-light.css`** — `--text2`/`--text3` estavam dessincronizados do bloco `--color-text-*` (valores claros antigos). Alinhados aos valores WCAG AAA já aprovados (`#424a5f`/`#5a6575`).
- **`api/_ai/profiles.js` + `docs/gateway-template/api/_ai/profiles.js`** — novo perfil **`crlv`** (kind image): extrai placa, renavam, cpf/cnpj do proprietário, chassi, marca/modelo, ano + confiança. Base para o fluxo CRLV→RNTRC→CIOT. Aditivo, sem tocar UI.

**Build:** ✓ (exit 0). Perfis: `nfd, crlv, rodorrica`.

## 2026-06-22 — Template do gateway standalone + guia de implementação nos outros apps

**Solicitado:** Fazer o necessário e deixar claro como implementar nos outros dois apps (Frota e YFFinance).

**Implementado:**
- **`docs/gateway-template/`** (novo): cópia portátil do núcleo de IA, pronta para ser o repo `yf-ai-gateway`. Contém `api/_ai/{provider,profiles,engine}.js` + `api/extract.js` (endpoint único com CORS + auth) + `vercel.json` + `package.json` + `.env.example`.
- **`docs/IMPLEMENTAR-NOS-OUTROS-APPS.md`** (novo): guia executivo completo — Etapa 1 (criar/publicar `yf-ai-gateway` na Vercel), Etapa 2 (integrar Frota), Etapa 3 (integrar YFFinance). Inclui código pronto para `api/ai-proxy.js`, `src/utils/aiExtract.js`, exemplo de uso em modal, como adicionar perfis novos, checklist e "o que NÃO muda".

## 2026-06-22 — Gateway de IA (referência) + endpoint único (fase 3)

**Solicitado:** Globalizar o "adaptador" de IA para servir toda importação de documento dos 3 apps (Controle Operacional, Frota, YFFinance), de forma que trocar de IA mexa **só no adaptador** — respeitando o banco de cada app.

**Decisão:** Gateway central. Esta sessão só alcança o `controle-operacional`, então o CO vira a **implementação de referência** + contrato; os outros 2 adotam em sessões próprias.

**Implementado (núcleo portátil em `api/_ai/`):**
- **`api/_ai/provider.js`** — provedor de IA (única peça que muda ao trocar de IA). Movido de `api/_lib/aiProvider.js` (removido).
- **`api/_ai/profiles.js`** — registro de **perfis de documento** (`nfd`, `rodorrica`): cada um define `buildInstruction` + `normalize` para um **formato neutro**, sem nada de banco. Adicionar um tipo de doc = adicionar um perfil.
- **`api/_ai/engine.js`** — motor que orquestra perfil + provedor (image/table).
- **`api/ai-extract.js`** — **endpoint único** `POST /api/ai-extract` que todos os apps chamam (`{ profile, image|headers+sample }` → JSON neutro). Auth opcional via `AI_GATEWAY_TOKEN` / header `x-ai-token`.
- **`api/analyze-nfd.js` e `api/parse-rodorrica.js`** — viraram **cascas finas** sobre o motor: o front não muda e as respostas são idênticas (back-compat total).
- **`docs/GATEWAY-IA.md`** — contrato compartilhado: endpoint, formatos por perfil, auth, como trocar de IA, como adicionar documento, e como extrair o núcleo num serviço dedicado (`yf-ai-gateway`) para centralizar de verdade.
- **`.env.example`** — `AI_GATEWAY_TOKEN`.

**Fronteira mantida:** o gateway devolve fatos extraídos num formato neutro; cada app traduz pro seu próprio Supabase. Build ✓, sem mudança de comportamento em produção.

## 2026-06-22 — IA como fallback do parser da Rodorrica (fase 2)

**Solicitado:** Estender a camada de IA para a **planilha XLSX da Rodorrica**, como fallback do parser quando ele falha.

**Problema:** `parseRodorricaXLSX` (App.jsx) casa **cabeçalhos exatos** (`DT CARREGAMENTO`, `NF CARREGAMENTO`…). Quando a planilha vem com nomes de coluna diferentes, ele retorna **0 linhas silenciosamente**.

**Implementado (a IA só mapeia nomes de coluna — não transcreve as linhas):**
- **`api/_lib/aiProvider.js`:** novo `analyzeText({ instruction })` (caminho texto do mesmo adaptador Gemini); refatorado p/ compartilhar `geminiGenerate(parts)` entre imagem e texto.
- **`api/parse-rodorrica.js`** (novo): função serverless que recebe `{ headers, sample }` e devolve `{ mapping }` (campo canônico → cabeçalho real da planilha). O mapping é **sanitizado** no servidor (só aceita cabeçalhos que existem de fato).
- **`src/utils/rodorricaParse.js`** (novo): `buildRodorricaRows(json)` (transform extraído verbatim do App.jsx, comportamento idêntico) + `rodorricaAIRemap(json)` (chama a API, renomeia as chaves e reaplica o mesmo transform a **todas** as linhas localmente — barato e confiável).
- **`src/App.jsx`** (via Python, sem Edit/Write direto): `parseRodorricaXLSX` agora usa `buildRodorricaRows`; se der **0 linhas e houver dados**, dispara o fallback de IA automaticamente. Resultado cai na **tela de Conferência de sempre** → operador confere. `onload` virou `async`. Backup: `App.jsx.bak_20260622_124113`.

**Reaproveita** a `AI_API_KEY` já configurada na Vercel (mesmo adaptador). Sem chave, o parser direto segue funcionando normal; só o fallback fica indisponível. Build ✓.

## 2026-06-22 — Camada de IA para análise de documentos (NFD, fase 1)

**Solicitado:** Uma camada de IA confiável para analisar documentos no upload do app — além do que já está programado — trazendo dados mais confiáveis para o lugar certo. Decisões fechadas: começar pela **foto da NFD**; IA **só sugere, operador confirma**; provedor via **adaptador genérico** (Gemini primeiro, trocável).

**Implementado:**
- **`api/_lib/aiProvider.js`** (novo): adaptador que isola o provedor de IA. Hoje chama Google Gemini (`generativelanguage.googleapis.com`); trocar de provedor = adicionar um caso e apontar `AI_PROVIDER`. A chave fica **só no servidor** (`AI_API_KEY`).
- **`api/analyze-nfd.js`** (novo): função serverless (Vercel) que recebe a foto em base64, monta o prompt da NFD e devolve JSON sanitizado — `{ numero, valor, tipo, confianca, observacao }`. `tipo` é validado contra a lista fixa de tipos de NFD.
- **`src/utils/analyzeNfdFoto.js`** (novo): cliente do front — reduz a imagem via canvas (cabe no limite de body da Vercel) e chama `/api/analyze-nfd`.
- **`src/modals/ModalNFD.jsx`:** botão "✨ Analisar foto com IA" (aparece quando há ≥1 foto). Pré-preenche nº/valor/tipo a partir da 1ª foto e mostra a confiança no toast. **O operador continua confirmando** no fluxo atual — a IA é uma camada extra, não a fonte única. Backup: `ModalNFD.jsx.bak_20260622_120846`.
- **`.env.example`:** documentadas as envs server-side `AI_API_KEY` / `AI_PROVIDER` / `AI_MODEL` (sem prefixo `VITE_`, logo nunca expostas no front).

**Para ativar:** definir `AI_API_KEY` (chave Gemini) nas Environment Variables do projeto na Vercel. CSP já permite o front chamar `/api/...` (mesma origem). Build ✓.

## 2026-06-16 — Nova aba global "Créditos Pendentes"

**Solicitado:** Implementar o que foi combinado em 15/06 — tela global de créditos pendentes (verificar/identificar por filial e cobrar caso o crédito não venha). Decisões fechadas: (a) "Cobrar" = registrar + gerar texto de cobrança por filial; (b) filtrar por filial + cliente.

**Implementado:**
- **Supabase** (migration `add_cobranca_cols_despesas_filial`): 2 colunas novas em `despesas_filial` — `cobrado_em` (timestamptz) e `cobranca_obs` (text). Diferenciam *pendente sem cobrar* → *cobrado, aguardando crédito* → *recuperado*.
- **`src/despesas.js`:** `listarIndevidasPendentesGlobal(conn)` (todas as filiais: `indevida=true AND credito_match_id IS NULL`), `marcarCobrado(conn,id,obs)`, `desmarcarCobrado(conn,id)`.
- **`src/views/CreditosPendentes.jsx`** (novo): aba global gated por `canFin`. KPIs (total pendente, a cobrar, já cobrados, item mais antigo), aging por lançamento (faixas 0–30/31–60/60+), agrupamento por filial, filtros (filial + status + busca), ação "Cobrar" inline (registra data/obs) e "Gerar cobrança" por filial (texto pronto p/ copiar). Mesmos primitivos visuais do Painel Financeiro.
- **`src/App.jsx`:** import + tab `creditos_pendentes` (perm `financeiro`, após Painel Financeiro) + bloco de render. Edição via script Python (sem Edit/Write direto). Build ✓.

**Observação (filtro "cliente"):** `despesas_filial` não tem coluna `cliente` (suas linhas são lançamentos financeiros: natureza/conta/histórico). O filtro "cliente" foi implementado como **busca textual** sobre natureza/histórico/conta/obs — equivalente prático de "a quem cobrar". Um campo `cliente` estruturado seria uma mudança maior, a avaliar se necessário.

**Pendente (não implementado nesta etapa):** vasculhar modais inline para refatorar — já anotado na memória do projeto; fica para quando solicitado (um passo de cada vez).

## 2026-06-11 — Açailândia: remove tab "Operac." do sidebar + diagnóstico de sync

**Solicitado:** Exclusivamente na base Açailândia: (1/2) verificar/comparar Supabase × Google Sheets de carga/descarga e a "data final"; (3) retirar "Operacional" do sidebar e checar campos exclusivos.

**Implementado (item 3) — `src/App.jsx`:**
- Tab `Operac.` marcado com `hideAvb:true` e novo filtro: oculto quando `baseAtual.id === "acailandia_avb"` (mantido nas demais bases). Build ✓.
- Sem campo órfão: `OperacionalView` usa tabelas SGS/Apontamentos, não os campos exclusivos AVB de carga/descarga.

**Diagnóstico (itens 1/2) — somente leitura, sem alteração de dados:**
- "Data final" da AVB = `DATA LIBERAÇÃO` (`data_lib`), não `data_desc` (planilha AVB não tem descarga).
- `data_lib` está VAZIA em 100% do Supabase (0/276); planilha tem 90 liberações preenchidas → `mapearColunaAVB` no `SyncSupabase_AVB.gs` não mapeia DATA LIBERAÇÃO (nem HOMERICO/RDO/CADASTRO FORTES/CTE COMP).
- Comparação por CÓDIGO (3 abas): 197 em comum; 0 na planilha faltando no Supabase; 4 órfãos no Supabase (69674, 70752, 70780, 70876) + 75 linhas legadas só com `dt` (sync nunca deleta).
- Descasamento app↔tabela: `SUPA_KNOWN_COLS` usa `data_liberacao/cadastro_fortes/cte_comp_num/gerenciadora`, mas a tabela tem `data_lib/cad_fortes/cte_comp/gerenc`.
- Correções (sync .gs, SUPA_KNOWN_COLS, limpeza de órfãos) pendentes de aprovação.

**Implementado (data_final / em trânsito) — após esclarecimento do usuário (data liberação ≠ descarga):**
- Supabase: criada coluna `data_final` (text) em `controle_operacional_avb` via migration `add_data_final_avb`. RPCs montam colunas dinamicamente → reconhecem a coluna sem alteração.
- `LogisticaAVB.jsx`: regra "Em Trânsito" passou de `CARREGADO && !chegada` para `CARREGADO && !data_final`; chip "Descarregado" exibido quando `data_final` preenchido.
- `ModalEdit.jsx` + `App.jsx`: campo "Data Final (Descarregado)" (type date) na seção Agenda, exibido apenas na AVB (`baseAtual` passado ao ctx; `isAvb`).
- Colunas na planilha SEM correspondente no Supabase (aba gid=407814645): TELEFONE, Nº APP RODORRICA, BANCO, AGÊNCIA, CONTA, CHAVE PIX, CPF/CNPJ, FAVORECIDO.

**Gravação por CÓDIGO + limpeza + colunas (aprovado pelo usuário — âncora = codigo):**
- LIMPEZA: removidas 75 linhas duplicadas (código gravado na coluna `dt` por import errado de 02/06; 100% tinham correspondente com `codigo`). Backup em `public._backup_avb_dups_20260611` (reversível). Tabela: 276→201, todos com código. Depois, 4 órfãos-com-código (69674, 70752, 70780, 70876) também removidos (não existiam na planilha; backup `_backup_avb_orfaos_20260611`) → 201→197, batendo exatamente com os 197 códigos da planilha.
- COLUNAS novas no Supabase (migration `add_avb_missing_columns`): `telefone, rodorrica, banco, agencia, conta, chave_pix, cpf_cnpj, favorecido, data_homerico`.
- RPC `upsert_operacional_cod` (migration): upsert ON CONFLICT (codigo), exclui `id` do INSERT (usa sequence). Testada (insert+update sem duplicar).
- `App.jsx` (supaUpsert + salvarRegistro): base AVB grava via `upsert_operacional_cod` por `codigo`; sem `dt` obrigatório. Sem código → confirm "carregamento avulso" antes de subir. `dadosBase` atualizado em memória. Demais bases inalteradas. Build ✓.
- `SyncSupabase_AVB.gs` (backup .gs): `mapearColunaAVB` mapeia DATA LIBERAÇÃO→data_lib, HOMERICO→data_homerico, RDO, CADASTRO FORTES→cad_fortes, CTE COMP→cte_comp, CTE COMP VLR→vl_cte_comp, TELEFONE, RODORRICA, BANCO, AGÊNCIA, CONTA, CHAVE PIX, CPF/CNPJ, FAVORECIDO. **AÇÃO DO USUÁRIO: colar no editor do Apps Script.**

**Ajustes finais (sync + dashboard):**
- `vl_cte_comp` convertida de `numeric` para `text` (migration `vl_cte_comp_to_text`): célula vazia da planilha enviava `""` → HTTP 400 `invalid input syntax for type numeric` derrubava o lote inteiro (sincronizados:0). Resolvido — sync OK (data_lib 89, homerico 196, rdo 93, fortes 195, telefone 71). Bancárias 0 pois ainda vazias na planilha.
- `dashMes` default = mês corrente (`MM/YYYY`) em vez de "todos"; Planilha já abria no mês corrente.
- Dashboard (AVB): agrupamento mensal passou a usar a mesma cadeia de fallback do `parseYM` da Planilha (data_carr→data_homerico→data_manifesto). Antes contava só `data_carr` (25 em 06/2026); agora bate com a Planilha (~37). Demais bases inalteradas.
- Dashboard (AVB): KPI "Carregamentos" passou a contabilizar **somente status CARREGADO** (exclui pendentes) — junho: 22.
- Dashboard (AVB): nova faixa operacional (não depende de canFin) com 4 KPIs: Em Trânsito (CARREGADO sem data_final), Encerradas (com data_final), Aguardando Liberação (CARREGADO sem data_lib), Tempo Médio Liberação (dias carreg.→data_lib).
- Colunas GANCHOS e BAIXA HOMERICO (planilha aba 407814645): criadas no Supabase (`ganchos`, `baixa_homerico`, text), mapeadas no `mapearColunaAVB`, e adicionadas ao `ModalEdit` (seção Operacional, só AVB). DATA CHEGADA já mapeava para `chegada` (existente). **AÇÃO: re-colar .gs + rodar sync.**

---

## 2026-06-11 — Nova logo redonda na tela de login

**Solicitado:** Colocar a nova logo do YFGroup na tela de login, redonda (não quadrada) e um pouco maior.

**Implementado:**
- Imagem `logo-yfgroup-nova.png` recortada em círculo (PNG transparente, 256px) → `assets/images/logo-login.png`.
- `src/App.jsx`: import da logo (`import loginLogo from '../assets/images/logo-login.png'`) e substituição dos 2 ícones SVG genéricos da tela de login/seletor de base por `<img>` redondo de 80px (antes 56px). Texto "YFGroup / Controle Operacional" mantido.
- Import via módulo (não caminho absoluto) para respeitar o `base` dinâmico do Vite (Vercel `/` × GitHub Pages `/controle-operacional/`).

**Resultado:** Build ✓ 0 erros; snapshot da tela confirma a logo no lugar do ícone.

---

## 2026-05-01 — Modularização de App.jsx (Plano 2026-04-30)

**Solicitado:** Quebrar App.jsx (9.053 linhas) em módulos focados sem mover lógica de negócio.

**Implementado — 11 arquivos criados:**
- `src/views/MotoristasView.jsx` — lista e cards de motoristas
- `src/views/DashboardView.jsx` — painel principal com gráficos
- `src/views/DiariasView.jsx` — controle de diárias e extrato
- `src/views/DescargaView.jsx` — controle de descargas e Rodorrica
- `src/views/AdminView.jsx` — painel administrativo completo
- `src/modals/ModalEdit.jsx` — modal de edição de registros
- `src/modals/ModalMotorista.jsx` — modal de cadastro de motorista
- `src/modals/ModalDetalhe.jsx` — modal de detalhe + ocorrências
- `src/modals/ModalUsuario.jsx` — modal de usuários e e-mail boas-vindas
- `src/modals/ModalConfigDB.jsx` — modal de config do banco + prefixos

**Resultado:** App.jsx reduzido de 9.053 → 6.182 linhas (−32%). Build: ✓ 0 erros.

---

## 2026-04-20 — Passo 4: Redesign Diárias

**Solicitado:** Redesign da view Diárias seguindo documentação.

**Implementado (App.jsx):**
- KPI financeiros (Total Devido/Pago/A Pagar): labels DM Mono uppercase tracking 0.06em `var(--text3)`; valores Space Grotesk 700 tracking -0.03em
- Status cards clicáveis (No Prazo/Perdeu Agenda/Sem Descarga): contador Space Grotesk 700 48px tracking -0.04em
- Tabs Resumo/Planilha/Conferência: active `var(--surface)` + border `var(--border2)` + cor `var(--accent)`
- Toggle Linhas/Blocos: active `var(--accent2)` + cor `var(--accent)`, font Space Grotesk
- Dashboard mini panels Diárias/Descargas: valor Space Grotesk 700 tracking -0.03em
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — Passo 3: Dashboard + Fix CSS Warning

**Solicitado:** Redesign do Dashboard e eliminar warning CSS do build.

**Implementado:**
- `theme-dark.css`: oklch convertidos para hex (--accent #7c3aed, --cyan #06b6d4, --green #22c55e, --orange #f97316, --red #ef4444, --yellow #eab308); elimina warning do esbuild
- `tokens.css`: restaurado `}` de fechamento do :root que estava truncado — raiz do warning
- `App.jsx` — Dashboard:
  - KPI label: DM Mono 11px uppercase tracking 0.06em `var(--text3)`
  - KPI value: Space Grotesk 700 28px tracking -0.04em
  - KPI sub: DM Sans 12px `var(--text2)`
  - Section labels (charts): DM Mono uppercase tracking 0.06em
  - Top Motoristas avatar: 28px circular (border-radius 50%)
  - Top Motoristas count: DM Mono 600 13px na cor do motorista
  - Tabela header: DM Mono 10px uppercase tracking 0.06em
  - Status badge: DM Mono 10px 500, fundo `cor/0.15` (bg leve)
  - Row hover: `var(--surface)` em vez de gold
  - Hero number: Space Grotesk 700 28px tracking -0.04em
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — Passo 2: Redesign Sidebar e Topbar

**Solicitado:** Implementar Passo 2 do redesign — Sidebar e Topbar seguindo documentação.

**Implementado (App.jsx):**
- Sidebar: bg `var(--surface)`, border `var(--border)`, transition `cubic-bezier(0.4,0,0.2,1)`
- Logo: truck SVG em caixa `var(--accent)` 36×36px + "YFGroup" Space Grotesk 700 + "CONTROLE OPERACIONAL" DM Mono
- Nav: separador PÓS-CARGA entre tabs principais e Descarga/Diárias; tab "busca" oculta no sidebar
- Items: hover `rgba(255,255,255,0.04)`, active `var(--accent2)` / `var(--accent)`, font Space Grotesk 13px
- CSS adicionado: `.co-sidebar__section-lbl`, `.co-sidebar__section-line`, `.co-sidebar__badge-pill`, `.co-sidebar__badge-dot`
- Footer: avatar gradiente `accent → cyan` com 2 iniciais do usuário
- Topbar desktop/mobile: título Space Grotesk 700 20px `letter-spacing:-0.03em`, subtítulo DM Mono
- index.html: corrigido byte `<\\!DOCTYPE` → `<\!DOCTYPE`


## 2026-04-20 — Passo 1: Design Tokens e Fontes (Redesign YFGroup)

**Solicitado:** Implementar Passo 1 do redesign — tokens de cor/tipografia seguindo documentação Claude Design.

**Implementado:**
- `tokens.css`: fontes atualizadas para Space Grotesk / DM Sans / DM Mono; adicionados `--ls-page-title`, `--ls-card-value`, `--ls-section-lbl`
- `theme-dark.css`: adicionados semantic tokens `--bg`, `--surface`, `--card`, `--card2`, `--border`, `--border2`, `--text`, `--text2`, `--text3`, `--accent`, `--accent2`, `--cyan`, `--green`, `--orange`, `--red`, `--yellow` (oklch)
- `index.html`: Google Fonts para Space Grotesk (400–700), DM Sans (400–600), DM Mono (400–500); `theme-color` atualizado para `#080810`


## [2026-04-09] — Filtros Planilha + Relatório Geral

**Solicitado:** Dropdowns Ano/Mês/Origem na Planilha (default: data mais recente + todas origens); Relatório Geral com filtro Status, orientação paisagem garantida e design inovador.

**Implementado:**
- `Planilha`: barra de filtros com selects Ano, Mês, Origem acima da toolbar. Ao carregar dados, auto-seleciona o ano e mês mais recente com `useEffect`. Export respeita os filtros ativos.
- `Relatório Geral de Operações`: novo campo "Status Operacional" no modal (CARREGADO, PENDENTE, EM ABERTO, NO-SHOW, NÃO ACEITE, CANCELADO); filtro aplicado em `gerarRelatorioGeral`; coluna "Status Oper." adicionada na tabela; bloco visual de distribuição de status com barras de progresso CSS por categoria; CSS do relatório renovado (section-title com fundo azul degradê, tabela com gradiente no header, subheader com gradiente dourado). Orientação paisagem já estava configurada (`@page{size:landscape}`).

**Backup:** `src/backups/App.jsx.bak_20260409_193919`

## 2026-04-10
**Solicitado:** Corrigir erro HTTP 400 / 22P02 ao salvar registro da descarga (campo numérico recebia string vazia).
**Implementado:** Em `supaUpsert` (App.jsx), adicionada sanitização que converte todos os campos `""` para `null` antes do POST ao Supabase.

## 2026-04-10
**Solicitado:** 4 melhorias na tela de Motoristas.
**Implementado:**
1. **Tel múltiplos:** Campos `tel` com vários números separados por `,;/\|` ou newline agora exibem cada número numa span própria no card.
2. **Sugerir Compatíveis:** Botão 🔗 na toolbar cruza placas dos motoristas × registros DADOS e abre modal com sugestões de vínculo (aceitar/ignorar/aplicar).
3. **Duplicata no cadastro:** Ao salvar NOVO motorista, verifica nome/CPF/placa1 duplicados e exibe aviso com opção de editar existente ou salvar mesmo assim.
4. **Seleção em lote:** Checkbox à esquerda de cada card; barra de ação aparece ao selecionar; exclusão em lote exige digitar `EXCLUIR` para confirmar. Delete individual mantido.

## 2026-04-13
**Solicitado:** 4 ajustes de UI — select-all motoristas, ícones SVG, layout full-width dashboard/diárias/descargas.
**Implementado:**
- Motoristas: botão "Selecionar Todos (N)" aparece na barra de lote ao selecionar 2+ itens (seleciona todos, incluindo fora da tela).
- Motoristas: ícones 📄✏️🗑️ substituídos por SVG via hIco() (documento ouro, lápis azul, lixeira vermelha), alinhados ao design system.
- Content wrapper: adicionados "dashboard", "diarias" e "descarga" ao grupo maxWidth:100%, eliminando espaços laterais no desktop.
- Descarga: removido maxWidth:560 fixo do seletor de abas (Hoje/Atraso/Aguardando) — agora preenche a largura disponível.

## 2026-04-13 (Dashboard Redesign)
**Solicitado:** Dashboard não ocupa a tela — ideias para mais índices e layout full-screen.
**Implementado:**
- KPI Strip horizontal (7 cards): Carregamentos/CTE, Taxa Eficiência, DTs Únicas, Motoristas Ativos, CTE Médio/Viagem, Diárias a Pagar, Alertas Ativos — todos com borda colorida por status e clicáveis.
- Grid principal 3 colunas: Gráfico de Evolução (maior, com toggle Carregamentos/CTE) | Status DTs (donut + barras de progresso com %) | Top 5 Motoristas (ranking com barra de % e avatares coloridos).
- Grid inferior 2 colunas: Registros Recentes (agora com coluna Destino) | Painel Operacional com Diárias (No Prazo/Perdeu/Aguardando + saldo) e Descargas (Hoje/Atraso/Aguardando + lista dos atrasados).
- Arquivo recuperado de truncamento via backup + tail para preservar integridade.

## 2026-04-14 — Mobile Layout & Sidebar

**Solicitado:** ajustar layout mobile do dashboard, relatórios, sidebar colapsável, motoristas visíveis no mobile e ícone superior esquerdo igual ao desktop.

**Implementado:**
- **Sidebar mobile:** sempre visível como mini-barra (icons, 64 px). Ao clicar no toggle expande para 220 px com overlay+scrim. Clique em item navega e colapsa de volta.
- **Bottom nav removida:** substituída pela sidebar mini.
- **Dashboard KPIs mobile (Modo B):** grade 2 colunas com cards compactos (padding, fonte e ícone reduzidos).
- **Motoristas mobile:** aba agora sempre acessível via sidebar mini (ícone visível sem precisar scrollar).
- **Relatórios mobile:** seletor de campos colapsável (hidden por default), botões Imprimir/CSV no header, tabela com `maxHeight:60vh`.
- **Ícone superior esquerdo:** sidebar logo unificado em 36×36 px em desktop e mobile; topbar mobile agora exibe nome da aba ativa (sem duplicar logo).

## 2026-04-15 — Logo YFGroup (fix definitivo)
**Solicitado:** Substituir logo Rodorrica pela nova logo YFGroup; corrigir logo antiga persistindo no desktop (localStorage); corrigir logo irregular no mobile ao colapsar sidebar. Gerar 3 opções de cor.

**Implementado:**
- **FIX 1 (desktop):** `App.jsx` linha 38 — migração one-shot via `co_logo_migrated_v1`: na primeira carga limpa `co_custom_logo` do localStorage, eliminando definitivamente a logo antiga Rodorrica cacheada.
- **FIX 2 (mobile):** CSS `.co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__logo` → adicionado `gap:0\!important` (elimina espaço irregular). Botão toggle hidden (`display:none\!important`) na sidebar colapsada mobile.
- **FIX 3 (desktop collapsed):** CSS `.co-sidebar--collapsed .co-sidebar__logo` → adicionado `gap:0` para centralização limpa.
- **Preview:** `logo_preview_opcoes.html` gerado com 3 variantes de cor para escolha (Ouro Total / Azul+Ouro / Verde+Ouro). `defaultLogo.js` será atualizado após confirmação da cor.
- **Backup:** `src/backups/App_backup_20260415_logo_fix.jsx`

## 2026-04-15 — Logo YFGroup Azul+Ouro (definitivo)
**Solicitado:** Usar nova_logo.png com variante Azul+Ouro; fundo preto ocupar todo o ícone; maximizar tamanho da logo no ícone.
**Implementado:**
- `defaultLogo.js`: nova logo YFGroup (azul #60a5fa wireframe + ouro #F3BA2F texto/badge), crop apertado, exportada 256×256px quadrada com fundo preto.
- `App.jsx` sidebar icon: `padding:4→0`, `background: gradiente→#000`, `overflow:hidden`, `objectFit:contain→cover` — logo preenche 100% do ícone sem borda visível.

## 2026-04-15 — 3 melhorias (login logo + buscar topo + filtro CARREGADO)
**Solicitado:**
1. Aplicar nova logo YFGroup na tela de login
2. Mover Buscar para topo no desktop (e mobile onde couber)
3. Diárias e Descargas: não contabilizar quando status ≠ CARREGADO

**Implementado:**
- **Login**: ícone 🚛 + caixa azul → `<img src={DEFAULT_LOGO}>` 96×96px, fundo preto, borda dourada
- **Buscar topo**: item `{k:"busca"}` movido para 1ª posição em `const tabs` — aparece no topo da sidebar desktop e mobile
- **Filtro CARREGADO Descarga**: `STATUS_EXCLUIR` (blacklist) substituído por `SOMENTE_CARREGADO` (whitelist). `hoje`, `atrasados` e `aguardando` agora filtram somente status=CARREGADO
- **Diárias**: já filtrava somente CARREGADO (linha 1045) — sem alteração necessária
- **Backup**: `src/backups/App_backup_20260415_3fixes.jsx`

## 2026-04-15 — Conferência de Extrato de Diárias
**Solicitado:** Upload do extrato .xlsx mensal e conferência automática contra dados do app.
**Implementado:**
- Instalado `xlsx` (SheetJS) como dependência
- Nova sub-aba **"Conferência"** em Diárias
- Upload via drag-and-drop ou clique (.xlsx/.xls)
- Cruzamento automático por Numero DT com status: BATE / DIVERGE / SEM CUSTO OK / SEM CUSTO DIV / NAO ENCONTRADA / FORA EXTRATO
- KPIs clicáveis + filtro por status + tabela completa
- Alerta visual de "Valor em risco" quando há divergências
- Clique na linha abre o registro no Buscar
- Backup: `src/backups/App_backup_20260415_extrato.jsx`

## 2026-04-16 — Conferência Planilha RODORRICA (Descarga + Stretch)
**Solicitado:** Validar automaticamente a planilha de controle de descargas (RODORRICA) contra os dados do app, similar ao que existe em Diárias.
**Implementado:**
- 3 novos estados: `rodorricaRows`, `rodorricaFileName`, `rodorricaFiltro`
- `useMemo rodorricaResultado`: agrupa planilha por DT (coluna ID), compara com `apontItems` (tipo descarga/stretch) — retorna BATE, DIVERGE, SEM_APONT, FORA_PLANILHA + valor em risco e totais
- `parseRodorricaXLSX(file)`: parser da aba BASE — lê ID, TIPO DO CUSTO, VALOR APROVADO, VALOR FINAL, NF, CENTRO
- Nova sub-aba "Conferência" no tab Descarga: upload drag-drop, KPIs clicáveis (4 status), tabela com colunas Desc/Stretch plan vs app por DT, colorização por divergência

## 2026-04-16 — Descarga: tabs compactos em linha única
**Solicitado:** 4 blocos de tab (Hoje/Atraso/Aguardando/Conferência) em uma só linha, menores, responsivos.
**Implementado:** grid repeat(4,1fr), padding reduzido, ícone oculto no mobile, label abreviada no mobile (primeira palavra), fonte menor — corrigido também o grid do resumo de Diárias que havia sido alterado por engano.

## 2026-04-16 — Diárias KPIs: fonte máxima desktop + compacto mobile
**Solicitado:** Aumentar fonte dos números (No Prazo/Perdeu Agenda/Sem Descarga) ao máximo no desktop; mobile em linha única com ícones e fontes ajustados.
**Implementado:** Desktop fontSize 26→56 (Bebas Neue), label 8→10px, ícone 10→11px; Mobile fontSize 32, padding reduzido, ícones e hint ocultos — blocos ficam em linha única.

## 2026-04-17 — Fix: DT com data_agenda inválida aparecia como "SEM DESCARGA"
**Solicitado:** DT 23003322 aparecia como "sem descarga" mesmo com data_desc preenchida.
**Causa:** data_agenda = "OC" → parseData retornava null → nenhum `if/else if` em `diariasData` capturava o caso, tipo ficava "pendente".
**Implementado:** Adicionado `else if (\!da && dd)` em `diariasData` (App.jsx ~linha 1093) → registros sem data_agenda válida mas com data_desc preenchida classificados como "ok".
**Backup:** src/backups/App_backup_20260417_fix_diarias_sem_agenda.jsx

## Passo 5 — Carga/Descarga (2026-04-20)
**Solicitado:** redesign tipográfico da view Descarga seguindo spec YFGroup
**Implementado:**
- KPI tabs big number: Bebas Neue → Space Grotesk 700 34px tracking -0.04em
- KPI tabs label: → DM Mono 11px uppercase tracking 0.06em
- Toggle view (lista/kanban): azul t.azul → var(--accent) / var(--accent2)
- Toggle cols (1/2/3): azul t.azul → var(--accent) / var(--accent2)
- Empty state h3 (2x): Bebas Neue 17px → Space Grotesk 600 15px tracking -0.02em

## 2026-04-20 — Passo 9: Extração de Views (Planilha / Operacional / Ocorrências)
**Solicitado:** Atualizar App.jsx com imports, nova tab Ocorrências e renderização via componentes externos.
**Implementado:**
- `App.jsx`: imports de `OcorrenciasView`, `OperacionalView`, `PlanilhaView`
- Sidebar `posCarga` set expandido: inclui `"ocorrencias"` (aparece na seção Pós-Carga)
- Tab `ocorrencias` adicionada antes de `operacional` com ícone triângulo-alerta
- Bloco `activeTab==="planilha"` (173 linhas) → `<PlanilhaView ctx={{...}} />`
- Bloco `activeTab==="operacional"` (522 linhas) → `<OperacionalView ctx={{...}} />`
- `activeTab==="ocorrencias"` adicionado → `<OcorrenciasView dados filtroOcorr abrirDetalhe />`
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — 6 melhorias UI/UX

**Solicitado:** Diárias blocos iguais Descarga / Ocorrências só obs / Admin footer / Sidebar limpa / Tema ícone / Relatórios view.

**Implementado:**
- **Diárias KPI**: blocos No Prazo/Perdeu Agenda/Sem Descarga convertidos para estilo flat idêntico ao Descarga (ícone 22px → label DM Mono → número Space Grotesk 34px, sem círculo)
- **Ocorrências**: filtro `dados.filter(r => obs_chegada || obs_descarga)` — só exibe DTs com obs preenchida; texto truncado a 100 chars
- **Sidebar footer**: removidos Sincronizar, Alertas e Relatórios; Admin movido para footer (ícone + label "Admin", acende em `var(--accent)` quando ativo, visível só para admin)
- **Tema**: botão icon-only (sem label de texto), permanece no footer
- **Relatórios**: substituído `<ReportBuilder>` por `<RelatoriosView>` (dashboard com KPIs + botão Exportar abre modais de filtro)
- Build: ✓ 0 erros

## [2026-04-20] — Layout & UX

**Solicitado:** 6 melhorias visuais e de layout

**Implementado:**
1. **PlanilhaView** — todas as colunas com `textAlign: center` (DT, Placa, datas, status, origem, destino)
2. **RelatoriosView** — tab "Visão Geral" com cards estilo Dashboard (borda-left colorida, número grande); modal Exportar agora lista todas as **colunas** do `fieldCatalog` por grupo com export CSV direto
3. **OcorrenciasView** — filtro de data inicial/final adicionado; seletor de colunas 1/2/3/4; `maxWidth:900` removido (preenche tela completa); grid usa coluna selecionada
4. **App.jsx — Diárias > Planilha** — tabela e filtros com `margin: 0 -16px` para preencher lado a lado
5. **App.jsx — Diárias > Conferência** — tabela de extrato com `margin: 0 -16px` para preencher lado a lado

**Arquivos alterados:** PlanilhaView.jsx · OcorrenciasView.jsx · RelatoriosView.jsx · App.jsx

## 2026-04-21 — Responsividade, Consistência Visual e UX

**Solicitado:** Ajustes de consistência visual, responsividade, usabilidade — mobile/tablet seguindo padrão desktop. Correções em Ocorrências, Carga/Descarga, Modo Claro, WhatsApp, Sidebar, Alertas e Relatórios.

**Implementado:**
- **Alertas:** Ícone de sino removido; substituído por badge pill "N alertas" (triângulo de alerta + contagem) no topbar desktop e mobile
- **WhatsApp:** Movido do rodapé da sidebar para acima da seção "Pós-Carga" como item de navegação (com dropdown de tipos ao clicar)
- **Sidebar — Usuário:** Bloco de usuário agora clicável (admin → abre aba Admin; outros → abre modal de usuário); ícone "Sair" inline ao lado do nome
- **Sidebar — Sair:** Botão separado removido; consolidado inline no bloco do usuário
- **Modo claro:** Adicionados tokens semânticos faltantes (--bg, --surface, --card, --accent, --accent2, --cyan, --green, --red, --yellow, --orange) ao theme-light.css; sidebar com hover/active visíveis no tema claro; bordas de cards restauradas
- **Responsividade:** CSS extras para full-viewport (min-height:100dvh mobile, co-main preenchendo viewport); Carga/Descarga e Relatórios usam minHeight:calc(100vh-56px)
- **Ocorrências:** Card exibe telefone do motorista (lookup por CPF/nome/placa) abaixo do DT/placa
- **Relatórios:** Tela inicia no modo "Tudo" (todos os blocos visíveis); filtros do modal de PDF convertidos para selects dinâmicos derivados dos dados reais do Supabase (motoristas, origens, destinos, status operacional, vínculo)

## Session 4 — 2026-04-21

**Solicitado:**
1. Regra geral de preenchimento de viewport (`className="co-content"`)
2. Botão "Nova Ocorrência" em Ocorrências com modal de busca + formulário

**Implementado:**
- `App.jsx`: adicionado `className="co-content"` no wrapper de conteúdo principal — aplica `flex:1; overflow-y:auto; min-height:0` em todas as telas sem necessidade de ajuste individual
- `App.jsx`: novo callback `salvarOcorrenciaExterna(dt, texto, tipo)` — segue o mesmo padrão de `adicionarOcorrencia` (localStorage + Supabase) 
- `App.jsx`: prop `onSalvarOcorrencia={salvarOcorrenciaExterna}` passada para `OcorrenciasView`
- `OcorrenciasView.jsx`: botão "Nova Ocorrência" (roxo, top-right dos stats) abre modal `NovaOcorrModal`
- `NovaOcorrModal`: passo 1 = busca por DT ou nome (filtra `dados`, lista até 8 resultados); passo 2 = seleção + tipo (Info/Alerta/Status) + textarea com Ctrl+Enter para salvar

## Session 5 — 2026-04-21

**Solicitado:** Layout global sistêmico, dropdown dark theme, Nova Ocorrência inline nos cards

**Implementado:**
- `App.jsx`: removido `maxWidth:1100` do wrapper de conteúdo — todas as telas usam `maxWidth:"100%"`, eliminando vazio lateral em monitores largos
- `App.jsx`: CSS global para `select` — `color-scheme: dark/light` por tema; `option` herda background e color da paleta do app (fim do fundo branco no dropdown escuro)
- `OcorrenciasView.jsx`: botão `+` inline em cada OcorrCard, ao lado de Obs Chegada e Obs Descarga, abre `NovaOcorrModal` com o DT pré-selecionado (sem etapa de busca)
- `NovaOcorrModal`: aceita `initialEntry` prop — quando chamado do card pula direto ao formulário; quando chamado do botão do header mantém a busca manual

## Session 6 — 2026-04-21 (Layout Global Sistêmico)

**Solicitado:** Padronização global de layout — desktop/tablet/mobile sem espaços vazios, sidebar colapsável, mobile sem ícones extras no topo.

**Implementado:**
- **CSS global**: `co-content` com `flex:1; overflow-y:auto; min-height:0`; conteúdo sempre `maxWidth:100%`; `co-content>*` herda `box-sizing:border-box`
- **Tablet (768-1199px)**: sidebar CSS icon-only por padrão (width:64px); `co-main{margin-left:64px\!important}`; classe `co-sidebar--expanded` para expansão manual; `sidebarCollapsed` inicializa `true` em tablets automaticamente
- **Mobile topbar**: removidos user badge, sync, theme toggle, reports, WhatsApp, logout do topo direito; mantidos apenas alerta + Nova DT; navegação concentrada no sidebar esquerdo
- **select/dropdown**: `color-scheme:dark/light` global — fim do fundo branco em dropdowns
- **Removed**: `co-mobile-nav` render (era CSS-hidden); `minHeight:calc(100vh-140px)` hacks inline substituídos pelo flex global; padding `68px` bottom obsoleto removido
- **Adicionado**: `.co-auto-grid` utilitário para grids responsivos automáticos

## Session 7 — 2026-04-21
**Solicitado:** (1) Corrigir WPP mobile que abria duas telas. (2) Melhorar modal Nova Ocorrência com mais contexto. (3) Apresentar resultado interativo desktop/mobile.
**Implementado:**
- WPP: substituído dropdown dentro da sidebar por modal root-level (`position:fixed, zIndex:1100`) — elimina conflito de z-index/scrim no mobile
- OcorrenciasView: modal reformulado com painel de contexto da DT (status badge, rota, datas, obs_chegada/obs_descarga), histórico de ocorrências anteriores, seletor de tipo visual (Info/Alerta/Status), textarea com borda colorida por tipo, navegação em 2 passos (busca → registrar)
- Build verificado: ✓ 2.94s
- Artifact interativo criado: preview com toggle desktop/mobile e tema claro/escuro

## Session 8 — 2026-04-21
**Solicitado:** Relatórios ainda com void lateral. Todas as telas: ajustar mobile/tablet, reduzir blocos/fontes para caber na tela.
**Implementado:**
- RelatoriosView: removido `maxWidth:1100` → `width:100%`; padding, fontes, gaps e números KPI responsivos via `isMobile`; tabela motoristas com `overflow-x:auto`; tabs com scroll horizontal; KpiCard usa `clamp()` para fontes
- App.jsx CSS: adicionadas regras globais `@media(max-width:767px)` e `@media(768-1199px)` — sem void lateral em todas as views, `co-content padding:0` mobile, tabelas com scroll, `co-auto-grid` 2 colunas mobile/tablet
- Build verificado: ✓ 2.87s

## Session 9 — 2026-04-21
**Solicitado:** WPP modal — busca de DT/motorista/placa direto no modal, sem depender de marcação prévia na planilha.
**Implementado:**
- Adicionados estados `wppSearchTxt` e `wppSearchReg`
- Modal substituiu bloco "Busque na Planilha primeiro" por campo de busca inline: digita 2+ chars → lista até 5 resultados (DT + nome + placa); clica → seleciona e exibe contexto verde com botão de limpar
- Se já havia seleção prévia (`buscaResult`), exibe direto — pode limpar para buscar outra
- Botões de opção usam `wppSearchReg || buscaResult` como registro efetivo
- Ao fechar/usar modal: reset automático da busca
- Build: ✓ 3.58s

## Session 10 — 2026-04-21
**Solicitado:** Exportar PDF abria dois modais (ExportModal + relGeralOpen/relOperOpen). Unificar em um modal. Relatório deve permitir selecionar quais colunas do Supabase incluir.
**Implementado:**
- RelatoriosView: removido ExportModal; botão "Exportar PDF" abre diretamente o modal relGeralOpen via prop onExportClick
- relGeralOpen: adicionada seção "Apontamentos (Descarga/Stretch)" na lista de seções
- relGeralOpen: adicionado seletor colapsável "Colunas da Tabela de Registros" — 25 colunas do Supabase com toggle individual + botões Todas/Nenhuma
- gerarRelatorioGeral: tabela de registros agora dinâmica usando colunas selecionadas
- Quando seção "Apontamentos" ativada: também dispara gerarRelatorioOperacional
- Build: ✓ 3.07s

## Session 11 — 2026-04-22
**Solicitado:** WPP trava em tela preta ao clicar. Relatórios não rola.
**Implementado:**
- WPP: substituído padrão IIFE aninhado por JSX condicional simples — eliminado risco de erro em render; removido autoFocus do input de busca
- Relatórios: removido overflow:"hidden" que bloqueava o scroll do co-content; agora a view rola normalmente
- Build: ✓ 17s

## 2026-04-24 — Design fixes (3 críticos)

**Solicitado:** Executar os 3 ajustes de maior impacto identificados na critique de design do App.jsx.

**Implementado:**
- **Fix 1 — Banner de truncamento:** adicionado aviso amarelo "Mostrando 80 de N — refine os filtros para ver todos" nos 3 locais com `.slice(0,80)` (diárias modo linhas, diárias modo blocos, descarga).
- **Fix 2 — Touch targets mínimos:** chips de filtro de diárias passaram de `padding:5px 10px` + `fontSize:9` para `padding:10px 14px` + `fontSize:11` + `minHeight:44px`; botões de colunas (diárias e descarga) passaram de `28×28px` para `36×36px` com `minWidth/minHeight:36`.
- **Fix 3 — KPI labels acessíveis:** labels dos cards KPI do dashboard ("No Prazo", "Perdeu Agenda", "Aguardando", "Hoje", "Em Atraso") passaram de `fontSize:7` para `fontSize:11` (2 ocorrências).

## 2026-04-24 — Touch targets completos

**Solicitado:** Corrigir todos os touch targets abaixo de 44px restantes no App.jsx.

**Implementado:**
- **16 botões ✕ de fechar modais:** `width:28,height:28` → `width:44,height:44` e `fontSize:14` → `fontSize:16` (todos os modais: editar, motorista, usuário, configdb, importação, WhatsApp, FAT, PAG, drill dashboard, planilha detalhe).
- **3 botões de ação de motoristas** (PDF, editar, excluir): `width:28,height:28` → `width:36,height:36,minWidth:36,minHeight:36` (tamanho 36 mantém o layout de linha sem quebrar).
- Resultado: 0 botões interativos com cursor:pointer abaixo de 36px.

## 2026-04-24 — Batch críticos + moderados + sidebar mobile

**Solicitado:** Executar todos os pendentes críticos e moderados. Aceitar proposta de sidebar 48px no mobile.

**Implementado:**

**Críticos:**
- C1: 4 cards clicáveis (diárias linhas/blocos, descarga linhas/blocos) receberam `tabIndex="0"`, `role="button"` e `onKeyDown` (Enter/Espaço) — acessíveis por teclado e leitor de tela.
- C2: 9 ocorrências restantes de `fontSize:7` → `fontSize:11` (badge ATRASADO, badge NOVO, label HOJE, labels modais WhatsApp ×5, "(opcional)"). Zero `fontSize:7` no arquivo.

**Moderados:**
- M1: Tokens `laranja` e `roxo` adicionados ao `constants.js` (dark: #f57c00/#a855f7; light: #c45500/#6d28d9). Substituídos 6 × `t.laranja` e 3 × `t.roxo` no App.jsx — saíram do inline hardcode.
- M2: Badge de status nos cards de blocos: `fontSize:8` → `fontSize:11` (texto agora legível).
- M3: Separador visual "ou período:" com `border-left` inserido antes dos date inputs nas barras de filtro de Diárias e Descarga. Os date inputs agora também limpam Ano/Mês ao serem usados.
- M4: KPIs de Diárias não forçam mais `setDSubTab("resumo")` ao clicar — filtro e navegação de sub-aba agora são independentes.
- M5: Emojis de campo nos cards de modo linhas (🔢 🚛 📅 🛬 🏁) receberam `role="img"` e `aria-label` semântico.

**Sidebar mobile:**
- A: Mini-sidebar reduzida de 64px → 48px abaixo de 600px, e `margin-left` do main ajustado de 64 → 48px — 16px a mais de área de conteúdo sem mudar o paradigma de navegação.

## 2026-04-26 — NFD: Upload de fotos no Supabase Storage
**Solicitado:** melhor forma de anexar fotos ao registrar uma NFD (avaria, falta, devolução ou sobra sem documento).
**Implementado:**
- `supabase.js`: nova função `supaStorageUpload` — upload direto via REST API do Supabase Storage (sem client oficial), retorna URL pública. Bucket alvo: `nfd-fotos`, path: `{DT}/{timestamp}_{filename}`.
- `App.jsx`: novos states `nfdFotos` (array de arquivos+preview) e `nfdUploadando` (flag de loading).
- Modal NFD reescrito: 4 tipos em grid 2×2 (avaria🔴, falta🟡, devolução🔵, **sobra🟢**); para "sobra" o Nº NFD é opcional e fotos são recomendadas; seletor de fotos com preview inline (máx. 5); botão "Registrar NFD" faz upload sequencial → salva URLs em `nfd.fotos`; estado visual "Enviando fotos…" durante upload.
- Pré-requisito: criar bucket `nfd-fotos` no Supabase (Storage > New bucket, public).

## 2026-04-26 — Conferência Rodorrica: análise descarga/stretch + modal de período

**Solicitado:** upload da planilha Rodorrica não retornava análise (0 registros); análise de compatibilidade descarga/stretch; modal de período pós-upload.

**Implementado:**
- `parseRodorricaXLSX`: lê aba `Aprovados` (antes tentava `BASE` → caía em `Detalhado` com formato pivot = 0 rows válidas); chave alterada de `ID` → `NF CARREGAMENTO`; captura `dtCarregamento`, `cliente`, `mesAno`, `rsFardo`, `rsStrech`; abre modal de período automaticamente após upload
- `rodorricaResultado`: agrupa por NF (antes por DT numérico que não batia com `apontItems`); cruza com `apontItems.nf_numero`; classifica cada tipo separadamente: BATE / MAIOR (planilha > app) / MENOR (planilha < app) / SEM_APONT / FORA_PLANILHA; detecta NFs sem Stretch e NFs sem Descarga
- UI: 5 KPI cards (Bate, Planilha Maior, Planilha Menor, Sem Apont., Fora Plan.); alertas de NFs incompletos; tabela com colunas Desc.Plan/Desc.App/Dif + Str.Plan/Str.App/Dif + status por tipo; modal de período re-abrível pelo botão 📅

## 2026-04-26 — Rodorrica: Comparação por DT vs DADOS (pag_descarga / pag_stretch)
**Solicitado:** Comparação Rodorrica por DT (col. "DT CARREGAMENTO"), contra colunas AP/AQ do Google Sheets (PAG. DESCARGA / PAG. STRETCH)
**Implementado:**
- `parseRodorricaXLSX`: corrigido — `DT CARREGAMENTO` agora mapeado como campo `dt` (número DT real, ex: 22593705); `DATA DE FATURAMENTO` usado como data de período
- `rodorricaResultado`: reescrito — agrupa por DT, faz lookup no DADOS, compara `pag_descarga`/`pag_stretch`; detecta `SEM_DADOS` (DT não encontrada no app) e `SEM_SYNC` (campos ainda não sincronizados)
- `mapearColuna` (Apps Script): adicionado `pag. descarga → pag_descarga` e `pag. stretch → pag_stretch` para próxima sync
- UI: tabela mostra DT como chave primária, NF como campo secundário, aviso de sync pendente quando campos não existem ainda

## 2026-04-27 — TELA PRETA DIÁRIAS / DESCARGA FIX
**Solicitado:** Diárias e Carga/Descarga exibindo tela preta.
**Causa:** React error #31 ("Objects are not valid as a React child") — duas IIFEs órfãs no modo "blocos" de cada aba retornavam arrays de objetos JS diretamente como filhos JSX.
**Implementado:** Removidas as IIFEs redundantes em `src/App.jsx` (linha 4115–4128 no bloco blocos-Diárias e linha 4612 no bloco blocos-Descarga). Build verificado ✓

## 2026-04-29 — Dashboard tela preta FIX
**Solicitado:** Dashboard exibindo tela preta.
**Causa:** `cores` definida dentro da IIFE do "Main Grid" mas usada fora do seu escopo no bloco "Registros Recentes" — ReferenceError em runtime crashava o render.
**Implementado:** Substituído `cores[i%cores.length]` por `CORES_DASH` definida localmente no próprio `.map()`. Build ✓

## 2026-04-29 — Dashboard Opção C: layout bottom + preenchimento sem corte
**Solicitado:** Opção C — Registros Recentes preenche altura sem cortar linha nem deixar espaço vazio; rota no meio; barra de progresso diárias; 3 atrasados; novo bloco Top Diárias Pendentes.
**Implementado:**
- `dashRecentesN` state + `dashRecCardRef` + ResizeObserver: calcula quantas linhas de 40px cabem exatamente e limita com `slice(0,dashRecentesN)` — sem corte, sem espaço vazio
- Cada linha fixada em `height:40px` — previsível para o cálculo
- Rota `origem → destino` adicionada no centro de cada linha
- Diárias: barra de progresso pago/total com cor dinâmica (verde≥80% / ouro≥40% / vermelho<40%)
- Descargas: lista de atrasados expandida de 2 → 3
- Novo bloco "Top Diárias Pendentes": agrupa saldo pendente por motorista, top 4 com barra horizontal
- Build ✓ 51 módulos

## 2026-04-29 — Login: Opção 3 (Gold + Fusion icon)
**Solicitado:** Redesign da tela de login no estilo Opção 3.
**Implementado:**
- Logotipo: ícone SVG "Fusion" (retângulo ouro opaco + retângulo violeta com circle ouro) + "YFGroup" Space Grotesk 700 + barra ouro 32px + "CONTROLE OPERACIONAL" espaçado
- Dois acentos de fundo radial (violeta topo + ouro base) para profundidade sem poluir
- Card: título "Entrar na plataforma" + subtítulo limpo + botão Google com hover violeta
- Separador "OU" + status "● Sistema Online — MÊS/ANO" dinâmico
- Fonte Bebas Neue removida (agora Space Grotesk em todo o login)
- Build ✓ 51 módulos

## 2026-04-29 — Planilha: default mês atual
**Solicitado:** Planilha sempre abre no mês corrente.
**Implementado:** `planilhaFiltroAno`/`planilhaFiltroMes` inicializados direto com `new Date()` (antes aguardavam o dado mais recente via useEffect). useEffect de auto-default removido. Build ✓
