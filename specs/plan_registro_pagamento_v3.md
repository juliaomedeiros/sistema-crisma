# Plano de Implementação Técnica (Plan): Módulo de Pagamentos v3.0, Ciclo Catequético & Fila de Recibos

**Projeto:** Sistema Crisma — Santuário Mãe Rainha  
**Versão:** 3.0  
**Data:** 14/08/2026  
**Spec de Referência:** [`spec_registro_pagamento_v3.md`](file:///c:/ProjectsCode/sistema-crisma/specs/spec_registro_pagamento_v3.md)  

---

## 1. Arquitetura de Dados & Alterações por Arquivo

### 1. Banco de Dados / Supabase (`schema.sql`)
- Adicionar suporte à tabela `configuracoes_sistema`:
  ```sql
  CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      chave TEXT PRIMARY KEY,
      valor JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

### 2. Interface HTML (`index.html`)
- **Remover:** `<select id="anoPagamento">` redundante.
- **Remover:** Botão legado `enviarWhatsApp()`.
- **Adicionar:**
  - Painel de Configurações da Turma & Ciclo na Aba 5 (`#containerConfigTurmaCiclo`).
  - Toggle no formulário de pagamento: `[x] Acumular recibo para envio no final do encontro`.
  - Botão `🧾 Disparar Recibos Pendentes do Encontro` na área de relatórios/ações.
  - Container de botões touch para os 12 meses do ciclo catequético (`#gridMesesCicloTouch`).

### 3. Lógica JavaScript (`js/data.js`, `js/utils.js`, `js/comprovante.js`, `js/evolution-service.js`)
- **`js/data.js`**:
  - Implementar gerenciador de configurações `carregarConfiguracoesSistema()` e `salvarConfiguracoesSistema()`.
  - Implementar gerador de meses do ciclo catequético ativo `gerarMesesCicloAtivo()`.
  - Refatorar `registrarPagamento()` para suportar salvamento ultrarrápido com a flag `recibo_pendente: true`.
- **`js/evolution-service.js`**:
  - Implementar `dispararRecibosPendentesDoDia()` para buscar pagamentos com recibos pendentes e realizar o envio em lote em segundo plano via Evolution Go.
- **`js/comprovante.js`**:
  - Atualizar gerador de recibo em texto formal contendo ciclo, meses quitados, valor e código de verificação.

### 4. Estilos CSS (`css/styles.css`)
- Estilização responsiva dos **Touch Tiles** de meses (`.month-tile`, `.month-tile.selected`, `.month-tile.paid`, `.month-tile.disabled`).
- Grid adaptável de 2 a 4 colunas em telas pequenas (mobile/tablet).

---

## 2. Testes de Validação

1. **Teste de Configuração de Ciclo:** Alterar o início do ciclo para Abril/2027 na aba de configurações e verificar que a grade de pagamento se reorganiza instantaneamente de Abril/2027 a Março/2028.
2. **Teste de Registro Flash:** Registrar pagamentos com o envio presencial desmarcado e verificar que os recibos entram na fila de pendentes.
3. **Teste de Disparo de Recibos do Encontro:** Clicar no disparo de recibos pendentes e verificar a execução em background pelo Evolution Go com o Banner no rodapé.
