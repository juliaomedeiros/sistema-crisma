# 🕊️ Sistema Crisma — Santuário Mãe Rainha

Sistema web para gestão integral da turma de **Crisma de Adultos do Santuário Mãe Rainha** (Igreja Católica Apostólica Romana).

---

## 📖 O que é o projeto?

O **Sistema Crisma** é uma aplicação web completa (Single-Page Application) desenvolvida para gerenciar todas as rotinas administrativas, financeiras, de frequência e de comunicação de turmas de catequese crismal.

Ele centraliza desde o cadastro dos crismandos e controle de presenças até a gestão do fluxo de caixa e o envio inteligente de mensagens via WhatsApp com comprovantes e lembretes automáticos.

---

## 🎯 Por que foi criado?

Na coordenação de turmas com grande número de catequizandos (como a turma atual de **~180 adultos**), o uso de planilhas manuais e anotações em papel gera:
- Falta de controle sobre inadimplência das contribuições mensais.
- Dificuldade para prestar contas do caixa da turma para a paróquia.
- Perda de tempo enviando cobranças e avisos um a um pelo celular.
- Risco frequente de **bloqueio de chip no WhatsApp** ao disparar mensagens para muitos contatos simultaneamente.

O **Sistema Crisma** foi projetado para resolver esses problemas com uma solução leve, gratuita, segura e sem custo de mensalidade de plataformas SaaS comerciais.

---

## ✨ Principais Funcionalidades

### 1. 💰 Gestão de Contribuições & Pagamentos
- **Ciclo Catequético Customizável:** Grade anual adaptada ao período da turma (ex: Setembro a Agosto).
- **Pagamento Multi-Mês em 1 Clique:** Registro de um ou vários meses de uma só vez, com prevenção de duplicidade.
- **Busca Rápida por Autocomplete:** Localização instantânea do crismando pelo nome.
- **Matriz Financeira Anual:** Visualização em formato de cards coloridos de todo o histórico de contribuições de cada aluno.
- **Relatórios & Exportação:** Geração de relatórios mensais e anuais exportáveis para Excel (`.xlsx`).

### 2. 🧾 Comprovantes Digitais Inteligentes
- **Comprovante Visual em Imagem (PNG):** Gerado via HTML5 Canvas com logotipo oficial, dados do pagamento, versículo bíblico e código de autenticação único de 8 caracteres.
- **Comprovante Consolidado em Texto:** Texto formatado pronto para envio pelo WhatsApp.
- **Compatibilidade Mobile:** Detecção automática de iPhone (iOS), Android e Desktop para download e compartilhamento facilitado.

### 3. 👥 Gestão da Turma & Importação Excel
- Importação rápida de dezenas de crismandos através de planilhas Excel (`.xlsx`).
- Cadastro manual individual com máscara de telefone e busca instantânea.
- Edição e exclusão simples de registros.

### 4. 📅 Controle de Frequência & Régua de Faltas
- Cadastro dos encontros de catequese por data e tema.
- Chamada rápida com chips de presença (`Presente`, `Falta`, `Justificado`) e botão para marcar todos como presentes.
- **Régua visual de faltas** com alertas automáticos (atenção aos 3, 5 e 6 faltas e alerta crítico a partir da 7ª falta).

### 5. 📊 Fluxo de Caixa Paroquial
- Registro discriminado de **Despesas** (Material Didático, Lanches, Liturgia/Eventos, Outros).
- Registro de **Entradas Extras** (Taxas de inscrição, doações e ofertas avulsas).
- Cálculo automático do **Saldo Atual em Caixa**.

### 6. 📱 Fila Backend Autônoma de WhatsApp (com Anti-Ban)
- **Envio 100% em Segundo Plano:** O catequista clica em disparar e pode fechar a aba ou desligar o computador. O servidor cuida do restante.
- **Protocolo de Proteção Anti-Ban Estrito:**
  - 🛡️ **Teto Seguro de 60 Mensagens/Dia:** Distribui lotes grandes de forma natural ao longo de dias úteis.
  - ⏰ **Horário Comercial:** Envios somente entre **08:00 e 20:00** (horário de Brasília).
  - 🎲 **Jitter Natural:** Intervalos variáveis e pausas humanas entre envios.
  - ⌨️ **Composing Proporcional:** Simula o status "digitando..." com base no tamanho do texto.
  - 🚨 **Detecção de Restrição (Reachout Timelock):** Congela a fila automaticamente caso o WhatsApp aplique bloqueio temporário, evitando banimento permanente do número.
- **Notificação Automática ao Coordenador:** O coordenador recebe um resumo no seu WhatsApp com o relatório completo de entregas e lista de falhas ao término de cada lote.
- **Dashboard de Monitoramento em Tempo Real:** Acompanhamento de mensagens pendentes, enviadas, falhas, reagendadas e botão para reenviar mensagens que falharam com 1 clique.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 puro e JavaScript Vanilla (sem frameworks pesados).
- **Backend / Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL 15 em nuvem).
- **Automação no Banco:** Extensões `pg_cron` e `pg_net` para processamento autônomo agendado.
- **Serverless Workers:** Supabase Edge Functions (Deno / TypeScript).
- **Gateway WhatsApp:** [Evolution Go](https://github.com/evolution-foundation/evolution-go) (whatsmeow em Go).
- **Manipulação de Planilhas:** SheetJS (`xlsx.full.min.js`).
- **Segurança & Criptografia:** Web Crypto API (SHA-256) e controle de sessão client-side.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Um navegador web moderno (Google Chrome, Firefox, Safari ou Microsoft Edge).
- Conexão com a internet (para comunicação com o banco Supabase e CDN de bibliotecas).

### Passo a Passo

1. **Clone ou baixe o repositório:**
   ```bash
   git clone https://github.com/juliaomedeiros/sistema-crisma.git
   cd sistema-crisma
   ```

2. **Configuração de Ambiente (`env.js`):**
   Verifique se as credenciais do Supabase e do Evolution Go estão preenchidas em `env.js`:
   ```javascript
   const ENV = {
       SUPABASE_URL: 'https://yqqpugheqqknpbetysme.supabase.co',
       SUPABASE_ANON_KEY: 'SUA_ANON_KEY_AQUI',
       EVOLUTION_GO_URL: 'http://SEU_IP_EVOLUTION:8080/',
       EVOLUTION_GO_API_KEY: 'SUA_API_KEY_AQUI',
       EVOLUTION_GO_INSTANCE: 'crisma-mae-rainha'
   };
   ```

3. **Execução:**
   Como a aplicação é construída em arquitetura Vanilla Web, basta abrir o arquivo `index.html` diretamente no navegador ou servir via qualquer servidor HTTP estático:
   - **Opção A (Direto):** Dê um duplo clique no arquivo `index.html`.
   - **Opção B (VS Code Live Server):** Clique com botão direito em `index.html` e selecione *Open with Live Server*.
   - **Opção C (Node / Python):**
     ```bash
     # Usando Python:
     python -m http.server 8000

     # Ou usando Node (npx serve):
     npx serve .
     ```
   Acesse no navegador: `http://localhost:8000`.

---

## 👥 Coordenação & Pastoral

**Pastoral da Crisma de Adultos**  
*Santuário Mãe Rainha — Igreja Católica Apostólica Romana*