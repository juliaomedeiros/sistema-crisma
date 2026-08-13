# Especificação Funcional: Sistema Crisma v2.0 (Navegação por Abas & Importação Excel)

**Data de Criação:** 12/08/2026  
**Status:** 🟡 Aprovado pelo Usuário — Em Execução  

---

## 📌 1. Visão Geral

Esta especificação define as melhorias da v2.0 do **Sistema Crisma - Santuário Mãe Rainha**, com foco em usabilidade móvel (smartphones e tablets) para a gestão de turmas com mais de 100 crismandos.

As melhorias principais consistem em:
1. **Navegação por Abas Responsivas (Tab Navigation)**: Organização modular em 5 abas distintas para facilitar o acesso em telas pequenas.
2. **Importação em Lote via Planilha Excel (`.xlsx`)**: Cadastro rápido de turmas inteiras com validação anti-duplicidade e mapeamento inteligente de colunas.

---

## 🛠️ 2. Requisitos Funcionais (RF)

### RF01 — Interface de Navegação por Abas Responsivas
- **Descrição**: O sistema deixará de ser uma página de rolagem contínua única e adotará uma estrutura de navegação por abas responsivas.
- **Divisão das Abas**:
  1. 🏠 **Aba 1: Início & Lançamentos**: Dashboard financeiro, formulário de pagamento Multi-Mês/Multi-Ano com autocomplete e validador de comprovantes.
  2. 👥 **Aba 2: Gestão da Turma**: Lista geral de 100+ crismandos com busca por nome em tempo real, adição manual individual e **Importação por Planilha Excel**.
  3. 📅 **Aba 3: Frequência & Chamadas**: Cadastro de encontros, lista de chamada e alertas de faltas acumuladas (3, 5, 6, 7 faltas).
  4. 📊 **Aba 4: Gestão de Caixa**: Lançamentos discriminados de despesas e receitas/taxas extras.
  5. ⚙️ **Aba 5: Conexão & Inadimplência**: Painel Inteligente de Cobrança (filtro estrito de devedores, disparo anti-ban) e status do Evolution Go.

### RF02 — Importação de Turma via Planilha Excel (`.xlsx`)
- **Descrição**: Permitir o upload de arquivos de planilha no formato `.xlsx` ou `.csv` para cadastrar dezenas ou centenas de crismandos de uma só vez.
- **Mapeamento de Colunas Inteligente**:
  - `Nome`: Aceita colunas chamadas `Nome`, `NOME`, `Nome Completo`, `Crismando`.
  - `Telefone`: Aceita colunas chamadas `Telefone`, `TELEFONE`, `Celular`, `WhatsApp`, `Contato`.
  - `Valor Mensal`: Aceita `Valor`, `Valor Mensal`, `Mensalidade` (com fallback padrão de R$ 10,00 se não informado).
- **Validação Anti-Duplicidade**:
  - Antes de inserir no Supabase, o sistema valida se o nome ou telefone já existem no banco.
  - Exibe relatório prévio: X novos crismandos para importar e Y ignorados por duplicidade.

---

## 🎨 3. Requisitos Não-Funcionais e Design
- **Mobile First**: Abas fáceis de tocar com os polegares em celulares e tablets.
- **Aparência Católica & Respeitosa**: Mantendo o tema visual do Santuário Mãe Rainha.
- **Desempenho**: Carregamento instantâneo via troca de abas sem recarregar a página.
