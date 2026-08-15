# Lista de Tarefas (Tasks): Evolução WhatsApp, Fila em Background & Keep-Alive de Sessão

**Plan de Referência:** [`plan_evolution_bg_session.md`](file:///c:/ProjectsCode/sistema-crisma/specs/plan_evolution_bg_session.md)  
**Data:** 14/08/2026  

---

## 📊 Resumo de Progresso

| Tarefa | Status | % Concluído |
| :--- | :---: | :---: |
| **1. Correção do Endpoint Evolution Go (Evitar Erro 404)** | ✅ Concluída | 100% |
| **2. Envio Individual Automático via API (sem wa.me)** | ✅ Concluída | 100% |
| **3. Gerenciador de Fila em Background & Banner Flutuante** | ✅ Concluída | 100% |
| **4. Proteção da Sessão (Keep-Alive Anti-Logout em `auth.js`)** | ✅ Concluída | 100% |
| **5. Estilização CSS e Validação de Integração** | ✅ Concluída | 100% |
| **TOTAL** | **5 / 5** | **100%** |

---

## 📋 Detalhamento das Tarefas

### ✅ Tarefa 1 — Correção do Endpoint Evolution Go
- [x] Atualizado `enviarTextoEvolutionGo()` em `js/evolution-service.js` para utilizar o endpoint `POST /message/sendText` com suporte a `instance` no header e body JSON (com fallback automático se necessário).

### ✅ Tarefa 2 — Envio Individual Automático via API
- [x] Refatorada a ação do botão individual no painel de cobrança para disparar via API diretamente sem abrir `wa.me`, dando feedback na própria linha (`⏳ Enviando...` $\rightarrow$ `✅ Enviado!`).

### ✅ Tarefa 3 — Gerenciador de Fila em Background & Banner Flutuante
- [x] Criadas funções de disparo assíncrono desacopladas do modal e implementado o Banner Flutuante de Progresso fixado no rodapé com contagem regressiva da pausa Anti-Ban.

### ✅ Tarefa 4 — Proteção da Sessão (Keep-Alive em `auth.js`)
- [x] Atualizado `auth.js` com o método `renovarSessao()` e bloqueio do logout por timeout durante `window.disparoEmAndamento`.

### ✅ Tarefa 5 — Estilização CSS e Validação
- [x] Adicionados estilos responsivos para o banner flutuante em `css/styles.css` e validada a integridade dos módulos JS.
