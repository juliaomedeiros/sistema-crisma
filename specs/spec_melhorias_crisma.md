# Especificação de Requisitos (Spec): Sistema Crisma — Fase 2

**Projeto:** Sistema Crisma — Santuário Mãe Rainha  
**Versão:** 2.0  
**Data:** 12/08/2026  
**Status:** Aprovado para Planejamento  

---

## 1. Visão Geral

### Contexto
O **Sistema Crisma** do Santuário Mãe Rainha (Igreja Católica Apostólica Romana) é uma aplicação SPA (HTML5, Vanilla CSS, Vanilla JS, Supabase) utilizada pelos organizadores da catequese de crisma para controle de pagamentos e cadastros. Atualmente, a gestão de pagamentos é realizada de forma individual mês a mês, a comunicação via WhatsApp depende de fluxos manuais com compartilhamento individual de PNGs, e não há módulo para controle de frequência aos encontros ou gestão discriminada de despesas e taxas extras.

### Proposta
Esta especificação documental detalha as melhorias funcionais e operacionais para expandir o sistema com:
1. **Lançamento de múltiplos meses de contribuição** em um único registro (atravessando anos como 2026/2027).
2. **Envio automatizado de mensagens em texto puro via Evolution API** para confirmação de pagamento consolidado e envio de lembretes.
3. **Painel Inteligente de Cobrança de Inadimplentes** com filtragem estrita de devedores e controle manual pelo administrador (possibilidade de desmarcar e cancelar disparo).
4. **Módulo de Controle de Frequência e Presença** com chamadas por encontro e alertas automáticos por faixas de faltas (3, 5, 6 e 7 faltas).
5. **Módulo Financeiro Consolidado** com registro de despesas detalhadas (descrição e categoria) e receitas/taxas extras (doações, inscrições).
6. **Interface de Pesquisa com Grid Mês a Mês** e Autocomplete Universal.

---

## 2. Objetivos

### Objetivo Principal
Automatizar a gestão operacional, financeira e pastoral da turma de Crisma de Adultos, reduzindo o trabalho manual da coordenação e garantindo total transparência financeira e de assiduidade.

### Objetivos Secundários
- Permitir pagamento em lote de múltiplos meses (mesmo que cruzem virada de ano) sem perder a granularidade no banco de dados.
- Automatizar o envio de notificações pelo WhatsApp via Evolution API de forma rápida, em texto puro e com mecanismo anti-ban.
- Alertar antecipadamente crismandos e coordenadores sobre o limite de faltas (máximo 7 faltas).
- Fornecer visibilidade real do caixa do projeto `(Mensalidades + Taxas/Doações Extras) - Despesas`.

---

## 3. Requisitos Funcionais

### RF01 — Lançamento Multi-Mês e Multi-Ano de Contribuição
- **Descrição:** O formulário de registro de pagamento deve permitir a seleção simultânea de múltiplos meses e o ano correspondente de cada mês.
- **Regras de Negócio:**
  - O usuário seleciona o ano vigente (ex: 2026) e marca os meses desejados via checkboxes.
  - O formulário permite expandir/incluir o ano posterior (ex: 2027) na mesma transação.
  - Ao salvar, o sistema realiza um *bulk insert* inserindo 1 registro por mês na tabela `pagamentos`, garantindo dados normalizados no banco.
  - Prevenção de duplicidade: impede selecionar meses que já possuem pagamento registrado no banco para aquele ano/crismando.
- **Critérios de Aceite:**
  - [x] Permite registrar de 1 a 12+ meses de uma só vez cruzando anos.
  - [x] Calcula automaticamente o valor total estimado (Quantidade de meses × Valor mensal).

### RF02 — Comprovante Consolidado e Envio de Texto via Evolution API
- **Descrição:** Após o registro de pagamento (seja de 1 ou múltiplos meses), o sistema enviará um **único texto consolidado** via Evolution API no WhatsApp do crismando.
- **Regras de Negócio:**
  - Não haverá envio de imagens PNG via WhatsApp, apenas mensagem de texto limpa e formal.
  - Saudação padrão: *"Olá, [Nome]"*.
  - Encerramento: Uma frase da tradição católica para bênção pastoral.
- **Modelo de Mensagem de Comprovante:**
  > *"Olá, [Nome]. Confirmamos o recebimento da sua contribuição da Crisma referente ao(s) mês(es): **[Mês/Ano]** (Valor Total: R$ [Valor]). Código de verificação: `[Código]`. Seu histórico atualizado já consta em nosso sistema. Obrigado!*  
  > *'Tudo é possível àquele que crê.' - Marcos 9:23. Tenha um abençoado dia!"*

### RF03 — Painel Inteligente de Cobrança (Inadimplência)
- **Descrição:** Painel exclusivo para disparo de lembretes aos crismandos com contribuições em atraso.
- **Regras de Negócio:**
  - **Filtragem Estrita:** A lista exibe **APENAS** os crismandos que possuem mês(es) em aberto até o mês vigente. Crismandos em dia **não aparecem na lista**.
  - **Aprovação do Admin:** Cada crismando da lista de devedores possui um checkbox pré-marcado por padrão. O administrador pode desmarcar quem não deve receber.
  - **Cancelamento:** Botão de ação `[🛑 Cancelar Disparo]` visível e operante durante a seleção e durante a execução do lote.
  - **Mecanismo Anti-Ban:** Pausa automática ajustável (15s a 45s) entre envios sucessivos.
- **Modelo de Mensagem de Cobrança:**
  > *"Olá, [Nome]. Passando para lembrar sobre a contribuição da Crisma referente ao mês de **[Mês/Ano]** (Valor: R$ [Valor]). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.*  
  > *'O Senhor é o meu pastor; nada me faltará.' - Salmo 23:1. Que Deus abençoe você e sua família!"*
- **Critérios de Aceite:**
  - [x] Envia mensagens em texto puro via Evolution API.
  - [x] Filtra estritamente os devedores no painel de cobrança sem exibir quem está em dia.
  - [x] Permite ao admin autorizar ou desmarcar pessoas da lista e oferece botão `[🛑 Cancelar Disparo]`.
  - [x] Executa a fila de envio com delay Anti-Ban randômico de 15s a 45s entre mensagens.

### RF04 — Controle de Frequência e Alerta de Faltas
- **Descrição:** Módulo para registro de chamada por data de encontro e monitoramento das faltas de cada crismando.
- **Critérios de Aceite:**
  - [x] Permite cadastrar encontros e realizar chamada individual.
  - [x] Exibe badges de alertas visuais (Amarelo = 3, Laranja = 5, Vermelho = 6, Desligado = 7+).
  - [x] Prepara modal de notificação de faltas via WhatsApp.

### RF05 — Gestão Financeira: Despesas Detalhadas e Entradas/Taxas Extras
- **Descrição:** Abas e formulários para registrar saídas de caixa (despesas) e receitas extras.
- **Regras de Negócio:**
  - **Despesas:** Cadastro com `Descrição Exata` (ex: "Compra de Bíblias"), `Categoria` (Material, Alimentação, Liturgia, Outros), `Valor` e `Data`. Exibidas em tabela discriminada.
  - **Entradas Extras:** Cadastro com `Descrição` (ex: "Taxa de Inscrição Retiro", "Doação Benfeitor"), `Origem/Tipo`, `Valor` e `Data`.
  - **Cálculo de Caixa no Dashboard:**
    $$\text{Saldo Total} = (\text{Mensalidades} + \text{Entradas Extras}) - \text{Total Despesas}$$
- **Critérios de Aceite:**
  - [x] Permite registrar despesas com descrição detalhada e categoria.
  - [x] Permite registrar entradas extras e taxas.
  - [x] Atualiza o saldo real em caixa no Dashboard automaticamente.

### RF06 — Pesquisa Individual com Matriz Mês a Mês
- **Descrição:** Ao buscar o crismando pelo nome (com autocomplete), exibir uma grade contendo os 12 meses do ano e seu status detalhado (Data do pagamento, valor e se foi feito em lote).

---

## 4. Requisitos Não-Funcionais e Segurança

- **RNF01 — Simplicidade Técnica (KISS):** Manter o padrão do projeto em Vanilla HTML5 + CSS + JavaScript ES6 sem bundlers ou frameworks reativos pesados.
- **RNF02 — Segurança de Chaves:** A chave da Evolution API e URL da instância devem ser configuradas no arquivo `env.js`.
- **RNF03 — Anti-Ban do WhatsApp:** Variação randômica no tempo de espera entre requisições da Evolution API (15-45 segundos) para evitar bloqueio do número.
- **RNF04 — Resiliência no Supabase:** Manter consultas paginadas via `.range()` para contornar o limite de 1000 registros nas tabelas de dados.

---

## 5. Fora de Escopo

- Disparo de imagens/comprovantes PNG via WhatsApp (exclusivo para texto).
- Alteração no layout das seções que já estão funcionando no sistema.
- Integração com gateways de pagamento automático (Pix/Cartão via webhook bancário).

---

## 6. Histórico de Alterações

| Versão | Data | Autor | Alterações |
| :--- | :--- | :--- | :--- |
| 1.0 | 12/08/2026 | Consultor Técnico | Documentação inicial dos requisitos da Fase 2 |
