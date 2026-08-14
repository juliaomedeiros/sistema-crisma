# Plano de Implementação Técnica (Plan): Evolução WhatsApp, Fila em Background & Keep-Alive de Sessão

**Projeto:** Sistema Crisma — Santuário Mãe Rainha  
**Versão:** 2.1  
**Data:** 14/08/2026  
**Spec de Referência:** [`spec_evolution_bg_session.md`](file:///c:/ProjectsCode/sistema-crisma/specs/spec_evolution_bg_session.md)  

---

## 1. Alterações de Código por Arquivo

### 1. `js/evolution-service.js`
- **Ajuste de Rota `enviarTextoEvolutionGo`:**
  - Alterar a URL para `${baseUrl.replace(/\/$/, "")}/message/sendText`.
  - Adicionar cabeçalho `instance: instanceName`.
  - Incluir campo `instance` no payload JSON.
  - Tratar retornos 200/201 OK e tratar falhas graciosamente.

- **Refatoração `abrirWhatsAppIndividual`:**
  - Alterar assinatura/comportamento para `enviarWhatsAppIndividualViaAPI(btn, nome, telefone, mes, ano, valor)`.
  - Executar a chamada via API sem redirecionar para `wa.me`.

- **Gerenciador de Fila e UI Flutuante (`iniciarDisparoLote` & Banner):**
  - Desvincular a execução do lote da visibilidade do modal.
  - Implementar as funções de injeção e atualização do Banner Flutuante no DOM (`renderizarBannerDisparoBackground`, `atualizarBannerDisparo`, `removerBannerDisparo`).

### 2. `auth.js`
- **Mecanismo Keep-Alive:**
  - Adicionar o método `renovarSessao()` para atualizar o `expiresAt` em `localStorage`.
  - Modificar `startSessionTimer()` e `checkSession()` para verificar `window.disparoEmAndamento`.
  - Se um disparo estiver ativo, impedir o logout automático e chamar `renovarSessao()`.

### 3. `css/styles.css`
- **Estilização do Banner Flutuante:**
  - Criar estilos para `#bannerDisparoBackground` no rodapé fixo (`position: fixed; bottom: 20px; right: 20px; z-index: 9999;`).
  - Animação suave de entrada/saída, barra de progresso em verde e indicador pulsante de envio.

---

## 2. Testes e Validações

1. **Teste de Envio Individual:** Verificar que o clique envia diretamente pela API Evolution Go sem abrir nova aba.
2. **Teste de Fila em Background:** Iniciar disparo em lote, fechar o modal, trocar entre as 5 abas, cadastrar crismando e confirmar que o envio continua sem pausar.
3. **Teste de Keep-Alive de Sessão:** Simular disparo prolongado e verificar que o timeout de 30 minutos não encerra a sessão nem desloga o usuário.
