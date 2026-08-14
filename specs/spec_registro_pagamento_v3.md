# Especificação de Requisitos (Spec): Módulo de Pagamentos v3.0, Ciclo Catequético & Fila de Recibos

**Projeto:** Sistema Crisma — Santuário Mãe Rainha  
**Versão:** 3.0  
**Data:** 14/08/2026  
**Status:** Aprovado para Implementação  

---

## 1. Visão Geral

Esta especificação define a reformulação completa do módulo de registro de pagamentos, a remoção definitiva do método legado de abertura de conversas no WhatsApp (`wa.me`), o fluxo agilizado para dias de atendimento presencial (recibos acumulados para envio em lote), o suporte ao **Ciclo Catequético Configurável** (ex: Setembro a Agosto, Abril a Março) e a reformulação da interface para **100% Mobile & Tablet First**.

---

## 2. Requisitos Funcionais (RF)

### RF01 — Configuração Dinâmica de Ciclo Catequético e Mensalidade
- **Descrição:** O sistema deve permitir configurar na aba de Configurações os parâmetros da Turma Ativa.
- **Campos Configuráveis:**
  - `Mês de Início do Ciclo`: ex: Setembro, Abril, Janeiro, etc.
  - `Ano de Início do Ciclo`: ex: 2026, 2027, 2028...
  - `Valor Mensal Padrão (R$)`: ex: R$ 10,00, R$ 15,00...
  - `Nome da Turma`: ex: "Crisma de Adultos 2026/2027".
- **Comportamento:** Persistência na tabela Supabase `configuracoes_sistema` (com fallback no `localStorage`).

### RF02 — Grade Dinâmica de Meses Touch-Friendly (Mobile & Tablet First)
- **Descrição:** O formulário de pagamento deixará de usar o seletor redundante "Ano Principal" e renderizará os 12 meses na ordem cronológica exata do ciclo catequético configurado.
- **Regras:**
  - Se o ciclo for **Set/2026 a Ago/2027**: exibir os botões na ordem: `Set/26`, `Out/26`, `Nov/26`, `Dez/26`, `Jan/27`, `Fev/27`, `Mar/27`, `Abr/27`, `Mai/27`, `Jun/27`, `Jul/27`, `Ago/27`.
  - **Estados Visuais dos Botões (Tiles):**
    - 🟢 **Selecionado:** Mês marcado para pagamento atual.
    - ⚪ **Disponível:** Mês em aberto pronto para ser selecionado.
    - 🔴 **Pago (Bloqueado):** Mês já quitado anteriormente por aquele crismando (impossibilita pagamento duplicado).

### RF03 — Validações Antierro de Cronologia de Pagamento
- **Descrição:** Prevenir equívocos no lançamento de meses antigos ou antecipados.
- **Regras:**
  - Se o usuário tentar selecionar um mês anterior à data de início do ciclo catequético ativo, o sistema exibirá uma confirmação de alerta:
    > `⚠️ Alerta: O mês selecionado (ex: Abr/2026) é anterior ao início da turma ativa (Set/2026). Confirma o registro?`
  - Se o usuário selecionar meses futuros dentro do ciclo ativo (ex: Abr/2027 em Set/2026), o sistema aceita normalmente e categoriza como **Quitação Antecipada**.

### RF04 — Agilidade Presencial: Registro Flash & Disparo de Recibos do Encontro
- **Descrição:** Atendimento presencial sem travamento de fila.
- **Regras:**
  - O formulário possuirá uma opção:
    - `[ ] Enviar recibo WhatsApp agora`
    - `[x] Acumular recibo para disparo em lote no fim do dia` *(padrão)*.
  - Ao salvar o pagamento, o registro é gravado no Supabase em menos de 1 segundo e a tela fica limpa para o próximo crismando.
  - Se acumulado, o pagamento é marcado como `recibo_pendente: true`.
  - **Botão "🧾 Disparar Recibos Pendentes do Encontro":** Busca todos os pagamentos com recibos pendentes e faz o disparo em lote via Evolution Go em segundo plano com o Banner Flutuante no Rodapé e delay Anti-Ban.

### RF05 — Eliminação Definitiva do Envio Legado `wa.me`
- **Descrição:** Remover todos os botões e funções que abrem a URL `https://wa.me/...`.
- **Regras:** Todo envio de comprovante/recibo passa 100% silencioso e automatizado pela API REST do Evolution Go.

---

## 3. Requisitos Não-Funcionais (RNF)

- **RNF01 — Mobile & Tablet First:** Botões de meses com área útil de toque de no mínimo 44px $\times$ 44px.
- **RNF02 — Performance:** Salvamento instantâneo de pagamentos sem requisições síncronas bloqueantes de imagem.
