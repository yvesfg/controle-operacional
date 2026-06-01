#!/usr/bin/env python3
"""
patch_avb_agenda.py — Etapa 8: calcAgendaAvb como fallback no DescargaView
+ Etapa 10: changelog Sessao 21 em constants.js
"""
import sys

# ── Etapa 8: import calcAgendaAvb + usar no card AVB ─────────────────────
SRC_DESCARGA = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/views/DescargaView.jsx"
with open(SRC_DESCARGA, encoding="utf-8") as f:
    txt = f.read()
original_d = txt

# Adicionar import de utils_avb
OLD_IMPORT = 'import { saveJSON, parseData, diffDias } from "../utils.js";'
NEW_IMPORT = (
    'import { saveJSON, parseData, diffDias } from "../utils.js";\n'
    'import { calcAgendaAvb, fmtDataAvb } from "../utils_avb.js";'
)
if OLD_IMPORT in txt:
    txt = txt.replace(OLD_IMPORT, NEW_IMPORT, 1)
    print("OK 1: import utils_avb adicionado em DescargaView")
else:
    print("FAIL 1: import line nao encontrada")

# No card AVB, substituir a linha de "Prev. Chegada" para usar calcAgendaAvb como fallback
OLD_PREV = "                {r.data_agenda&&chip(\"Prev. Chegada\", r.data_agenda, t.ouro)}"
NEW_PREV = (
    "                {(()=>{\n"
    "                  if (r.data_agenda) return chip(\"Prev. Chegada\", r.data_agenda, t.ouro);\n"
    "                  const ag = calcAgendaAvb(r.data_carr, r.destino);\n"
    "                  if (!ag) return null;\n"
    "                  return chip(`Prev. (${ag.dias}d/${ag.dist}km)`, fmtDataAvb(ag.data), \"#f59e0b\");\n"
    "                })()}"
)
if OLD_PREV in txt:
    txt = txt.replace(OLD_PREV, NEW_PREV, 1)
    print("OK 2: calcAgendaAvb como fallback de data_agenda no card AVB")
else:
    print("FAIL 2: linha Prev. Chegada nao encontrada")

if txt != original_d:
    with open(SRC_DESCARGA, "w", encoding="utf-8") as f:
        f.write(txt)
    print(f"DescargaView.jsx salvo ({txt.count(chr(10))} linhas)")
else:
    print("WARN: DescargaView sem alteracoes")

# ── Etapa 10: Changelog Sessao 21 em constants.js ────────────────────────
SRC_CONST = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/constants.js"
with open(SRC_CONST, encoding="utf-8") as f:
    txt2 = f.read()
original_c = txt2

OLD_CHANGELOG = 'export const DEV_CHANGELOG = ['
NEW_CHANGELOG = (
    'export const DEV_CHANGELOG = [\n'
    '  {\n'
    '    data: "2026-05-29", sessao: "Sessao 21",\n'
    '    itens: [\n'
    '      "FIX · AVB Dashboard: origens dinamicas (nao mais fixadas em BELEM/IMPERATRIZ) — KPIs deixam de zerar ao selecionar AVB.",\n'
    '      "FIX · AVB Planilha: parseYMfiltAvb com fallback em data_homerico/data_manifesto — planilha abre no mes corrente.",\n'
    '      "FEAT · AVB Planilha: COLS_AVB com 15 colunas operacionais; busca expandida (codigo, cte, mdf, nf, cliente, contratante, gerenciadora); filtros Contratante e Gerenciadora na toolbar.",\n'
    '      "FEAT · AVB Dashboard: KPI strip financeiro (soma contratos, adiantamentos, saldo, ticket medio CTE excluindo PENDENTES); ranking contratante duplo (qtd + valor).",\n'
    '      "FEAT · AVB Descarga: tela renomeada para Logistica AVB com tiles Em Transito / Prev. Hoje / Pendentes / Doc. Incompleta / Fin. Pendente; cards com status documental CTE/MDF/NF e saldo.",\n'
    '      "FEAT · AVB Agenda: calcAgendaAvb cliente com tabela de distancias (30 rotas); usado como fallback quando data_agenda nao vem do script.",\n'
    '      "FEAT · AVB Alertas: flags data invalida, documentacao incompleta e codigo zero — alertas padrao de descarga/saldo ocultados no contexto AVB.",\n'
    '      "FEAT · AVB Sync: SUPA_KNOWN_COLS expandido com codigo, data_homerico, data_liberacao, gerenciadora, rdo, contrato_mat, cadastro_fortes, cte_comp_num, cte_comp_vlr.",\n'
    '      "FEAT · utils_avb.js: modulo exclusivo AVB — parseMoedaAvb, calcSaldoAvb, flagErroData, flagPendenciaDocumental, normContratanteAvb, calcAgendaAvb, DISTANCIAS_AVB.",\n'
    '      "INFO · Escopo: TODAS as mudancas acima sao condicionais a baseAtual.id === acailandia_avb. Zero impacto em Imperatriz/Belem e Maracanau.",\n'
    '    ],\n'
    '  },'
)
if OLD_CHANGELOG in txt2:
    txt2 = txt2.replace(OLD_CHANGELOG, NEW_CHANGELOG, 1)
    print("OK 3: changelog Sessao 21 adicionado")
else:
    print("FAIL 3: DEV_CHANGELOG nao encontrado")

if txt2 != original_c:
    with open(SRC_CONST, "w", encoding="utf-8") as f:
        f.write(txt2)
    print(f"constants.js salvo ({txt2.count(chr(10))} linhas)")
