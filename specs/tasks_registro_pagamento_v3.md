# Lista de Tarefas (Tasks): Módulo de Pagamentos v3.0, Ciclo Catequético & Fila de Recibos

**Plan de Referência:** [`plan_registro_pagamento_v3.md`](file:///c:/ProjectsCode/sistema-crisma/specs/plan_registro_pagamento_v3.md)  
**Data:** 14/08/2026  

---

## 📊 Resumo de Progresso

| Tarefa | Status | % Concluído |
| :--- | :---: | :---: |
| **1. Tabela e Gerenciador de Configurações de Ciclo & Valor** | ✅ Concluída | 100% |
| **2. Grade Touch-Friendly de Meses por Ciclo (Mobile First)** | ✅ Concluída | 100% |
| **3. Validações Antierro de Datas e Cronologia do Ciclo** | ✅ Concluída | 100% |
| **4. Registro Flash de Atendimento & Disparo de Recibos Pendentes** | ✅ Concluída | 100% |
| **5. Remoção Definitiva de `wa.me` e Limpeza da UI** | ✅ Concluída | 100% |
| **TOTAL** | **5 / 5** | **100%** |

---

## 📋 Detalhamento das Tarefas

### ✅ Tarefa 1 — Configurações de Ciclo & Mensalidade
- [x] Criado gerenciador em `js/data.js` (`carregarConfiguracoesSistema`, `salvarConfiguracoesSistema`, `salvarConfiguracoesFormulario`) para salvar/carregar Mês/Ano de início do ciclo e valor mensal padrão no Supabase/localStorage, com painel de UI adicionado na Aba 5 (`index.html`).

### ✅ Tarefa 2 — Grade Touch-Friendly de Meses por Ciclo
- [x] Refatorado formulário em `index.html` e `js/data.js`, removido o campo redundante "Ano Principal" e renderizados os 12 botões (tiles touch) organizados cronologicamente na sequência exata do ciclo catequético ativo (ex: Set/26 $\rightarrow$ Ago/27 ou Abr/28 $\rightarrow$ Mar/29).

### ✅ Tarefa 3 — Validações Antierro de Cronologia
- [x] Adicionadas checagens inteligentes em `registrarPagamento()` que alertam com aviso de confirmação ao registrar meses anteriores ao início do ciclo ativo.

### ✅ Tarefa 4 — Registro Flash & Fila de Recibos Pendentes
- [x] Implementado fluxo de registro instantâneo (menos de 1 segundo) com opção de acumulador em lote para o fim do encontro e botão `🧾 Disparar Recibos Pendentes do Encontro` rodando em segundo plano via Evolution Go (`dispararRecibosPendentesDoDia`).

### ✅ Tarefa 5 — Remoção Definitiva de `wa.me` e Limpeza da UI
- [x] Removidas chamadas legadas ao `wa.me` e atualizados os estilos CSS (`css/styles.css`) para a nova interface responsiva de botões touch (Mobile/Tablet First).
