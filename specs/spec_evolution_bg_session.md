# Especificação de Requisitos (Spec): Evolução WhatsApp, Fila em Background & Keep-Alive de Sessão

**Projeto:** Sistema Crisma — Santuário Mãe Rainha  
**Versão:** 2.1  
**Data:** 14/08/2026  
**Status:** Aprovado para Implementação  

---

## 1. Visão Geral

Esta especificação define a correção técnica da integração com o **Evolution Go (v0.7.x em Golang)** e a evolução da experiência de usuário no disparo de mensagens de cobrança e comprovantes via WhatsApp.

### Problemas Resolvidos
1. **Erro 404 ao Disparar Mensagens:** Requisições enviadas para a rota `/message/sendText/{instancia}` falhavam com `404 page not found` devido a diferenças de rotas da API Golang.
2. **Abertura de Janelas Externas (`wa.me`) no Envio Individual:** O disparo individual abria uma nova guia no navegador em vez de enviar automaticamente via API.
3. **Bloqueio da Interface durante Disparo em Lote:** O disparo em lote prendia o usuário dentro do modal de cobrança, impedindo-o de navegar pelas abas do sistema ou registrar pagamentos durante o ciclo de envio (que pode durar até 50 minutos para 100 contatos devido ao intervalo Anti-Ban de 15s a 45s).
4. **Expiração da Sessão durante o Envio:** O temporizador de logout automático de 30 minutos em `auth.js` encerrava a sessão do usuário no meio do disparo em lote, interrompendo o envio.

---

## 2. Requisitos Funcionais (RF)

### RF01 — Rota e Payload Compatíveis com Evolution Go (Golang)
- **Descrição:** Ajustar a chamada HTTP POST em `js/evolution-service.js` para ser 100% compatível com a API REST do Evolution Go.
- **Regras:**
  - Endpoint base: `POST {EVOLUTION_GO_URL}/message/sendText` (sem o nome da instância no path).
  - Incluir cabeçalhos HTTP: `apikey` e `instance`.
  - Corpo JSON: `{ "instance": "nome-instancia", "number": "5583...", "text": "mensagem...", "options": { "delay": 1200 } }`.

### RF02 — Envio Individual Automatizado e Silencioso
- **Descrição:** O botão de envio individual no Painel de Cobrança deve realizar a requisição REST diretamente ao Evolution Go sem abrir abas externas (`wa.me`).
- **Regras:**
  - Ao clicar em "Enviar no Whats" em uma linha individual, alterar o botão para estado de carregamento (`⏳ Enviando...`).
  - Executar a função de envio via API.
  - Exibir o resultado (`✅ Enviado!` ou `❌ Falha`) na própria linha da tabela.

### RF03 — Gerenciador de Fila de Disparo em Lote em Background na SPA
- **Descrição:** O envio em lote deve rodar de forma assíncrona desacoplada do modal de cobrança, permitindo navegação total do usuário.
- **Regras:**
  - O usuário pode fechar o modal de cobrança após iniciar o lote.
  - Exibir um **Banner Flutuante no Rodapé** contendo:
    - Progresso numérico e percentual (ex: `14/100 (14%)`).
    - Nome do contato atual sendo processado.
    - Contagem regressiva da pausa Anti-Ban (ex: `Pausa Anti-Ban: 25s restantes`).
    - Botão `[🛑 Cancelar Disparo]`.
  - O usuário pode navegar livremente pelas 5 abas da SPA, registrar pagamentos, consultar o caixa e cadastrar crismandos.

### RF04 — Proteção de Sessão (Keep-Alive Anti-Logout)
- **Descrição:** Evitar que a sessão do usuário expire enquanto houver um disparo em lote em andamento.
- **Regras:**
  - Bloquear o encerramento da sessão em `auth.js` se `window.disparoEmAndamento === true`.
  - Auto-renovar o timestamp de expiração no `localStorage` a cada mensagem processada.
  - Restaurar o comportamento normal de timeout (30 minutos) após a conclusão ou cancelamento do lote.

---

## 3. Requisitos Não-Funcionais (RNF)

- **RNF01 — Manutenção do Padrão Vanilla:** Sem adição de frameworks reativos ou dependências pesadas externas.
- **RNF02 — Anti-Ban do WhatsApp:** Preservação estrita do delay randômico de 15s a 45s entre disparos sucessivos.
- **RNF03 — Feedback Visual Claro:** O usuário deve ter visibilidade constante do status de envio em qualquer aba do sistema.
