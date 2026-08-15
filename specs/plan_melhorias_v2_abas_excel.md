# Plano Técnico de Implementação: Sistema Crisma v2.0

**Especificação de Referência:** [`spec_melhorias_v2_abas_excel.md`](file:///c:/ProjectsCode/sistema-crisma/specs/spec_melhorias_v2_abas_excel.md)  
**Data:** 12/08/2026  

---

## 🛠️ Arquitetura das Alterações

### 1. Sistema de Abas CSS/JS (`css/styles.css`, `index.html`, `js/app.js`)
- Criar barra de navegação `.tab-navigation` com 5 botões de abas: `#btnTabInicio`, `#btnTabCrismandos`, `#btnTabFrequencia`, `#btnTabFinanceiro`, `#btnTabEvolution`.
- Mudar visibilidade de cada container `.tab-pane` via classe `.active-tab`.
- Salvar a aba ativa no `sessionStorage` para manter o usuário na mesma aba se a página recarregar.

### 2. Módulo de Importação Excel (`js/excel-import.js`)
- Ler arquivo enviado via `<input type="file" id="arquivoExcelCrismandos" accept=".xlsx, .xls, .csv">`.
- Usar `XLSX.read(arrayBuffer, { type: 'array' })`.
- Mapear linhas para o objeto `{ nome, telefone, valor_mensal }`.
- Checar contra array local `crismandos` para evitar duplicatas.
- Exibir modal de confirmação com tabela dos novos registros.
- Realizar `insert` em lote no Supabase via `supabase.from('crismandos').insert(...)`.

---

## 📁 Estrutura de Arquivos

```
js/
├── app.js             # Gerenciamento de inicialização e rotas de abas
├── excel-import.js    # Módulo de leitura, validação e importação de planilhas
├── data.js            # Lógica de pagamentos e crismandos
├── frequencia.js      # Chamadas e encontros
├── financeiro.js      # Despesas e entradas extras
└── evolution-service.js # Evolution Go & Inadimplência
```
