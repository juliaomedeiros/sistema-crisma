# GEMINI.md - Documentação Completa da Arquitetura e Estado: Sistema Crisma

> **Finalidade do Documento:** Este arquivo é a fonte única da verdade para LLMs, agentes de IA e desenvolvedores que trabalham no projeto **Sistema Crisma - Santuário Mãe Rainha**. Toda a arquitetura, regras de negócio, banco de dados, proteções anti-ban e fluxos estão detalhados aqui.

---

## 📌 1. Visão Geral do Projeto

O **Sistema Crisma** é uma aplicação web Single-Page Application (SPA) responsiva criada para a **Pastoral da Crisma de Adultos do Santuário Mãe Rainha** (Igreja Católica Apostólica Romana).

- **Objetivo Principal:** Gerenciar integralmente o ciclo catequético de uma turma de crisma (atualmente ~180 crismandos), abrangendo:
  1. Cadastro e importação de alunos via Excel.
  2. Registro financeiro de mensalidades e contribuições mensais.
  3. Gestão completa do fluxo de caixa paroquial (entradas extras e despesas).
  4. Controle de chamada e frequência nos encontros com régua de faltas.
  5. Geração de comprovantes digitais (PNG e texto formatado).
  6. Disparo de avisos, lembretes de cobrança e recibos via WhatsApp de forma **100% autônoma no servidor** com **proteção Anti-Ban estrita (teto de 60 msgs/dia)**.
- **Público-alvo:** Coordenadores e catequistas da turma.
- **Filosofia de Código:** Vanilla Web (HTML5, CSS3 puro, JavaScript Vanilla modular). Zero frameworks pesados (sem React, Vue, Angular ou bundlers como Vite/Webpack). Leve, rápido e acessível via navegador mobile ou desktop.

---

## 🛠️ 2. Arquitetura e Tecnologias

- **Frontend:**
  - HTML5 semântico com navegação por abas responsivas (`tabInicio`, `tabCrismandos`, `tabFrequencia`, `tabFinanceiro`, `tabEvolution`, `tabAvisosLote`).
  - CSS3 puro (`css/styles.css`) com suporte a Dark/Light accents, Grid, Flexbox e Mobile First.
  - JavaScript Vanilla estruturado em módulos por responsabilidade (`js/`).
- **Backend Serverless & Banco de Dados (Supabase Cloud):**
  - **PostgreSQL 15** hospedado no Supabase (`https://yqqpugheqqknpbetysme.supabase.co`).
  - SDK `@supabase/supabase-js@2` (via CDN).
  - **Extensões Ativas:** `pg_cron` (agendamento em banco) e `pg_net` (requisições HTTP assíncronas do banco).
  - **Edge Functions (Deno/TypeScript):**
    - `enviar-whatsapp`: Proxy seguro para disparo individual via Evolution Go.
    - `processar-fila-whatsapp`: Worker autônomo agendado pelo `pg_cron` a cada 2 minutos.
    - `processar-fila-reagendada`: Reprocessador legado para falhas 463/500.
- **WhatsApp Gateway:**
  - [Evolution Go](https://github.com/evolution-foundation/evolution-go) (baseado na biblioteca em Go `whatsmeow`).
  - Hospedado em VPS Oracle Cloud (`http://144.22.164.103:8080/`), instância `crisma-mae-rainha`.
- **Autenticação Client-Side:**
  - `auth.js` com SHA-256 via `Web Crypto API`, timeout de 30 minutos de inatividade, renovação automática durante operações e limite de tentativas na tabela `usuarios_autenticados`.
- **Relatórios & Excel:**
  - `xlsx.full.min.js` (SheetJS via cdnjs) para geração e download de relatórios `.xlsx`.

---

## 📁 3. Estrutura de Arquivos e Responsabilidades

```
c:\ProjectsCode\sistema-crisma\
├── index.html                  # Interface gráfica principal e estruturação das 6 abas
├── auth.js                     # Classe AuthSystem: Login, SHA-256, timeout de sessão e logout
├── env.js                      # Configurações de ambiente (URLs do Supabase e Evolution Go)
├── plano-fila-backend.md       # Especificação detalhada da fila autônoma e anti-ban
├── README.md                   # Apresentação do projeto e guia rápido de uso
├── GEMINI.md                   # Documentação mestre completa do sistema
├── assets/
│   └── mae rainha-1.png        # Logomarca oficial do Santuário Mãe Rainha
├── css/
│   └── styles.css              # Estilos globais, modais, cards de dashboard, chips e tabelas
├── js/
│   ├── app.js                  # Inicialização do DOM, verificação de auth e alternância de abas
│   ├── supabase-config.js      # Inicialização do cliente Supabase e teste de ping
│   ├── data.js                 # Estado local (crismandos, pagamentos paginados, configs do ciclo)
│   ├── comprovante.js          # Canvas HTML5 para comprovante PNG, texto consolidado e links wa.me
│   ├── evolution-service.js    # Enfileiramento de avisos, cobranças e recibos na fila do Supabase
│   ├── dashboard-fila.js       # Central de monitoramento da fila, cards, timelock e conexão Evolution
│   ├── frequencia.js           # Gestão de encontros catequéticos e chamada de presença
│   ├── financeiro.js           # Livro caixa: lançamentos de despesas e entradas extras
│   ├── excel-import.js         # Importação em massa de crismandos via planilha .xlsx
│   └── utils.js                # Normalização de telefones (+55 83...), máscaras, relatórios Excel e busca
└── supabase/
    ├── setup_fila_backend.sql  # DDL das tabelas de fila, controle diário e cron job do worker
    ├── setup_reagendamento.sql # Script SQL legado para fila reagendada
    └── functions/
        ├── enviar-whatsapp/             # Edge Function proxy de envio individual
        ├── processar-fila-whatsapp/     # Edge Function worker autônomo (anti-ban + 60/dia)
        └── processar-fila-reagendada/   # Edge Function legada de reprocessamento
```

---

## 🖥️ 4. As 6 Abas da Aplicação

### Aba 1: 🏠 Início & Pagamentos (`tabInicio`)
- **Dashboard Financeiro Geral:** 5 cards com métricas em tempo real (Total de Crismandos, Mensalidades Quitadas, Entradas Extras, Total de Despesas, Saldo Atual em Caixa).
- **Alerta de Inadimplência:** Identifica devedores do mês corrente e abre o modal de cobrança com botão `📱 Gerar Lembretes de Cobrança`.
- **Formulário de Pagamento Multi-Mês:**
  - Campo com autocomplete dinâmico para seleção do crismando.
  - Grade de 12 botões/checkboxes correspondentes ao ciclo catequético (Setembro do ano de início até Agosto do ano seguinte).
  - Cálculo instantâneo do valor total baseado na quantidade de meses selecionados.
  - Botão `💰 Registrar Pagamento(s)`: Salva no Supabase prevenindo duplicidades.
  - Botão `🧾 Ver Comprovante em Texto`: Exibe modal com texto pronto, versículo bíblico e código de autenticação único de 8 caracteres.
  - Botão `🧾 Disparar Recibos Pendentes do Encontro`: Enfileira os comprovantes acumulados na fila autônoma do servidor.
- **Pesquisa Individual & Matriz Anual:** Histórico completo de contribuições de cada aluno com cards coloridos (verde = pago, vermelho = pendente).
- **Relatório Mensal e Exportação Excel:** Tabela filtrável por Mês/Ano e exportação para `.xlsx`.

### Aba 2: 👥 Turma & Excel (`tabCrismandos`)
- **Importação em Massa via Excel:** Leitura de planilhas `.xlsx` com colunas *Nome* e *Telefone*, cadastrando dezenas de crismandos com validação automática.
- **Cadastro Individual:** Formulário manual para adicionar novos crismandos.
- **Tabela Dinâmica:** Busca em tempo real por nome/telefone, edição e exclusão.

### Aba 3: 📅 Frequência (`tabFrequencia`)
- **Cadastro de Encontros:** Data, tema da aula e observações.
- **Chamada Interativa:**
  - Lista de chamada com filtros rápidos por chips (`Todos`, `🟢 Presentes`, `🔴 Faltas`, `🟡 Justificados`).
  - Botão de atalho `☑️ Marcar Todos Presentes`.
  - **Régua de Alertas de Faltas:**
    - 🟡 3 Faltas: Aviso inicial.
    - 🟠 5 Faltas: Atenção moderada.
    - 🔴 6 Faltas: Alerta crítico.
    - ⛔ 7+ Faltas: Desligado da turma.

### Aba 4: 📊 Gestão de Caixa (`tabFinanceiro`)
- **Livro Caixa Paroquial:**
  - Lançamento de despesas com categorias (*Material Didático*, *Alimentação/Lanche*, *Liturgia e Eventos*, *Outros*).
  - Lançamento de entradas extras (*Taxa Extra*, *Doação*, *Oferta Avulsa*, *Inscrição Retiro*).
  - Tabelas discriminadas com exclusão e recálculo automático do saldo geral.

### Aba 5: ⚙️ Servidor WhatsApp & Configurações (`tabEvolution`)
- **Configurações da Turma:** Mês de início do ciclo (padrão: Setembro), ano de início, valor mensal padrão e nome da edição.
- **Configuração do Coordenador:** Campo para cadastrar o WhatsApp do coordenador que receberá relatórios e alertas automáticos.
- **Central de Monitoramento da Fila de Mensagens (NOVO):**
  - **5 Cards de Métricas:** *Na Fila*, *Enviadas Hoje*, *Falhas Definitivas*, *Reagendadas*, *Teto Seguro Diário (ex: 47 / 60 com barra de progresso visual)*.
  - **Banner de Alerta `NotifyAccountReachoutTimelock`:** Contagem regressiva em tempo real exibindo a expiração de restrições do WhatsApp com aviso de fila congelada.
  - **Status da Instância Evolution Go:** Checagem via API HTTP (🟢 Conectado / 🔴 Desconectado / 🟡 Aguardando QR).
  - **Tabela Histórica com Filtros:** Filtro por chips (`Todos`, `📢 Avisos em Lote`, `💰 Cobranças`, `🧾 Recibos`), descrição do erro e botão **`[🔄 Reenviar]`** individual com prioridade alta.

### Aba 6: 📢 Avisos em Lote (`tabAvisosLote`)
- **Compositor de Mensagens Livres:** Textarea com suporte a variáveis dinâmicas (`{nome}`, `{telefone}`, `{valor}`).
- **Preview Visual do WhatsApp:** Card estilizado simulando a visão exata do crismando.
- **Seleção Flexível:** Botões `[Marcar Todos]`, `[Desmarcar Todos]` e checkboxes individuais de cada aluno.
- **Disparo Seguro em Background:** Ao clicar em `🚀 Iniciar Disparo em Lote`, enfileira apenas os contatos marcados na fila do banco de dados e libera o operador imediatamente.

---

## 🛡️ 5. Arquitetura da Fila Backend e Protocolo Anti-Ban

### O Problema Resolvido:
O envio de mensagens para contatos novos ou sem histórico (*cold reachout*) por APIs não-oficiais (whatsmeow / Evolution Go) aciona os filtros heurísticos da Meta caso haja rajadas sequenciais, gerando o evento `NotifyAccountReachoutTimelock` (trava de 24 horas) e revogação da sessão (`device_removed / 401`).

### As 5 Camadas de Proteção Ativas:

1. **Teto Rígido de 60 Mensagens/Dia:**
   - Controlado via banco na tabela `controle_envios_diarios`.
   - Para a base de ~180 crismandos, o lote é distribuído em ~3 dias úteis.
2. **Horário Comercial Estrito:**
   - A Edge Function só dispara mensagens entre **08:00 e 20:00** (horário de Brasília). Fora desse horário, descansa automaticamente.
3. **Jitter Estocástico Anti-Padrão:**
   - 20% das invocações do `pg_cron` são propositalmente puladas para que os envios não ocorram em intervalos matemáticos idênticos.
4. **Composing Humano Proporcional:**
   - O worker envia o estado `presence: "composing"` (digitando...) proporcional ao tamanho da mensagem (~35ms por caractere, entre 3.5s e 9.5s).
5. **Circuit Breaker para Timelock e Falhas:**
   - Se o WhatsApp retornar erro 463 ou evento de Reachout Timelock, o sistema grava `timelock_ativo = true` e congela a fila por 24 horas, notificando o coordenador e exibindo alerta no dashboard para evitar banimento definitivo.

### Ciclo de Execução:
```
[pg_cron a cada 2 min]
       │
       ▼
[Edge Function: processar-fila-whatsapp]
       │
       ├─ É horário comercial (08h às 20h Brasília)? ──(Não)──► Pausa até 08:00
       ├─ Timelock ativo no banco? ──────────────────────(Sim)──► Fila congelada
       ├─ Limite diário (60) atingido hoje? ─────────────(Sim)──► Pausa até amanhã
       ├─ Jitter estocástico (pula 20% das vezes)? ──────(Sim)──► Pausa humana
       │
       ▼
[Pega 1 mensagem pendente no banco]
       │
       ▼
[Envia via Evolution Go com Composing proporcional]
       │
       ├─ Sucesso ──────► Marca 'enviado' + Incrementa contador diário
       │                  Verifica se é o último do lote ➔ Notifica Coordenador
       │
       ├─ Erro 463 ─────► Ativa Timelock 24h + Alerta Coordenador
       │
       └─ Erro 500/Rede ─► Reagenda para 35 minutos (até 3 tentativas)
```

---

## 🗄️ 6. Esquema do Banco de Dados (Supabase PostgreSQL)

| Tabela | Finalidade | Políticas RLS |
|---|---|---|
| `crismandos` | Dados dos alunos (id, nome, telefone, valor_mensal) | Pública (`anon` e `authenticated`) |
| `pagamentos` | Registro das contribuições (crismando_id, mes, ano, valor, data_pagamento) | Pública (`anon` e `authenticated`) |
| `codigos_autenticacao` | Códigos únicos de 8 caracteres para validação de comprovantes | Pública (`anon` e `authenticated`) |
| `usuarios_autenticados` | Contas de login dos coordenadores (email, senha_hash, salt, tentativas) | Restrita via `auth.js` |
| `encontros_crisma` | Datas e temas dos encontros de catequese | Pública |
| `frequencia_crisma` | Presenças/faltas de cada crismando por encontro | Pública |
| `despesas_crisma` | Gastos e saídas do livro caixa | Pública |
| `entradas_extras_crisma` | Taxas e doações do livro caixa | Pública |
| `configuracoes_sistema` | JSON com ciclo catequético e `telefone_coordenador` | Pública (`Permitir tudo`) |
| `fila_mensagens_whatsapp` | Fila de envio (lote_id, tipo_envio, telefone, mensagem, status, prioridade) | Pública (`Permitir tudo`) |
| `controle_envios_diarios` | Contador diário de envios (limite 60) e flags de timelock | Pública (`Permitir tudo`) |

---

## 🤖 7. Regras Mandatórias para LLMs ao Modificar o Projeto

1. **Preserve a simplicidade (KISS & YAGNI):** Nunca sugira migração para React, Next.js, Vite ou Tailwind a menos que explicitamente ordenado pelo usuário. O projeto funciona via arquivos estáticos diretos.
2. **Preserve a Experiência do Usuário (UX):**
   - Nunca altere a posição de botões existentes.
   - Sempre mantenha os botões `[Marcar Todos]`, `[Desmarcar Todos]` e checkboxes individuais onde houver seleção de contatos.
3. **Respeite o Banco e Paginação:** Ao buscar dados de `pagamentos`, sempre use busca paginada com `.range()` para superar o limite de 1000 registros do Supabase.
4. **Proteção Anti-Ban é Sagrada:** Nunca reduza os delays para menos de 30s nem remova o teto de 60 msgs/dia em disparos automáticos.
5. **Idioma Oficial:** Todo código de interface, comentários, mensagens de erro, alertas e relatórios devem ser em **Português do Brasil (PT-BR)**.
