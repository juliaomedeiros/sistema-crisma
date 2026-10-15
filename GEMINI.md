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
  6. Disparo de avisos, lembretes de cobrança e recibos via WhatsApp de forma **100% autônoma no servidor** através da **Meta Cloud API Oficial (teto de 250 msgs/dia, sem risco de banimento)**.
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
    - `enviar-whatsapp`: Proxy seguro para disparo via Meta Cloud API Oficial.
    - `processar-fila-whatsapp`: Worker autônomo agendado pelo `pg_cron` a cada 2 minutos em lotes de até 5 msgs (teto 250/dia).
- **WhatsApp Gateway:**
  - **Meta Cloud API Oficial (WhatsApp Business Platform v21.0)**.
  - Templates Homologados e Aprovados: `aviso_ausencia_crisma`, `lembrete_mensalidade_crisma`, `comprovante_pagamento_crisma` e `comunicado_geral_crisma`.
  - Evolution Go totalmente descontinuado/removido.
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
  - Botão `💰 Registrar Pagamento(s)`: Salva no Supabase prevenindo duplicidades em pagamentos e enfileira o comprovante automaticamente na fila do servidor com deduplicação rigorosa (não reenvia recibo duplicado para o mesmo aluno e mesmos meses).
  - Botão `🧾 Ver Comprovante em Texto`: Exibe modal com texto pronto, versículo bíblico e código de autenticação único de 8 caracteres.
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
    - 🟡 3-4 Faltas: Aviso inicial.
    - 🟠 5 Faltas: Atenção moderada.
    - 🔴 6 Faltas: Alerta crítico.
    - ⛔ 7+ Faltas: Desligado da turma.
- **Notificação de Ausências por Encontro:**
  - Ao salvar chamada com faltas, abre modal com checkboxes individuais, `[☑️ Marcar Todos]` e `[⬜ Desmarcar Todos]`.
  - Enfileira no servidor com o template oficial `aviso_ausencia_crisma` (Categoria: UTILITY) sem travar o navegador do catequista.
- **Panorama Geral de Faltosos:**
  - Botão `📊 Panorama de Faltosos (N)` no topo da lista de frequência.
  - Abre modal consolidado de todos os crismandos com `≥ 1 falta` no ciclo ordenados por criticidade.
  - Campo de busca instantânea, checkboxes individuais, `[☑️ Marcar Todos]` e `[⬜ Desmarcar Todos]`.
  - Botão de disparo de resumo geral de faltas via WhatsApp Meta Cloud API com o template `resumo_faltas_crisma` (Categoria: UTILITY).

### Aba 4: 📊 Gestão de Caixa (`tabFinanceiro`)
- **Livro Caixa Paroquial:**
  - Lançamento de despesas com categorias (*Material Didático*, *Alimentação/Lanche*, *Liturgia e Eventos*, *Outros*).
  - Lançamento de entradas extras (*Taxa Extra*, *Doação*, *Oferta Avulsa*, *Inscrição Retiro*).
  - Tabelas discriminadas com exclusão e recálculo automático do saldo geral.

### Aba 5: ⚙️ Servidor WhatsApp & Configurações (`tabEvolution`)
- **Configurações da Turma:** Mês de início do ciclo (padrão: Setembro), ano de início, valor mensal padrão e nome da edição.
- **Configuração do Coordenador:** Campo para cadastrar o WhatsApp do coordenador que receberá relatórios e alertas automáticos.
- **Central de Monitoramento da Fila de Mensagens:**
  - **6 Cards de Métricas em Tempo Real:**
    1. *Na Fila (Pendentes)*: Mensagens aguardando processamento pelo worker.
    2. *Enviadas Hoje*: Quantidade do dia com **Custo Hoje em R$** calculado automaticamente e divisão `Utilidade • Marketing`.
    3. *Fatura Estimada no Mês*: Somatório financeiro das mensagens entregues no mês corrente em R$ com total de envios e divisão `Utilidade • Marketing` (Permite saber exatamente o valor da fatura da Meta).
    4. *Falhas Definitivas*: Mensagens que esgotaram tentativas.
    5. *Reagendadas / Aguardando*: Mensagens aguardando janela de tempo.
    6. *Teto Seguro Diário*: Barra de progresso visual e cota diária oficial (ex: `109 / 250`).
  - **Tabela de Tarifas Oficiais Meta Brasil (BRL):**
    - **Utility (Utilidade):** R$ 0,0350 / msg (`comprovante_pagamento_crisma`, `lembrete_mensalidade_crisma`, `aviso_ausencia_crisma`, `resumo_faltas_crisma`).
    - **Marketing:** R$ 0,3217 / msg (`comunicado_geral_crisma`).
  - **Status da Conexão:** 🟢 Meta Cloud API Oficial Conectada.
  - **Tabela Histórica com Filtros:** Filtros por chips (`Todos`, `📢 Avisos em Lote`, `💰 Cobranças`, `🧾 Recibos`, `📅 Faltas`).
  - **Ações na Fila:** Exibição da data/hora exata da geração da mensagem, botão individual **`[🗑️ Excluir]`**, botão individual **`[🔄 Reenviar]`** com alta prioridade e botão mestre **`[🔄 Reenviar Todas as Falhas]`** respeitando o limite diário de 250 mensagens.

### Aba 6: 📢 Avisos em Lote (`tabAvisosLote`)
- **Compositor de Mensagens Livres:** Textarea com suporte a variáveis dinâmicas (`{nome}`, `{telefone}`, `{valor}`).
- **Preview Visual do WhatsApp:** Card estilizado simulando a visão exata do crismando.
- **Seleção Flexível:** Botões `[Marcar Todos]`, `[Desmarcar Todos]` e checkboxes individuais de cada aluno.
- **Disparo Seguro em Background:** Ao clicar em `🚀 Iniciar Disparo em Lote`, enfileira os contatos marcados na fila do banco de dados com template `comunicado_geral_crisma` e libera o operador imediatamente.

---

## 🛡️ 5. Arquitetura da Fila Backend e Meta Cloud API Oficial

### As Proteções Ativas:

1. **Teto Rígido de 250 Mensagens/Dia:**
   - Controlado via banco na tabela `controle_envios_diarios`.
   - Limite oficial seguro da Meta para turmas e pastorais sem risco de bloqueio.
2. **Horário Comercial Estrito:**
   - A Edge Function só dispara mensagens entre **08:00 e 20:00** (horário de Brasília). Fora desse horário, descansa automaticamente.
3. **Disparo em Lotes Controlados:**
   - O worker processa lotes de até 5 mensagens por ciclo de 2 minutos acionado pelo `pg_cron`.
4. **Templates Homologados por Finalidade:**
   - `aviso_ausencia_crisma` (UTILITY): Notificação de ausência de encontro específico.
   - `resumo_faltas_crisma` (UTILITY): Resumo do panorama de faltas acumuladas.
   - `comprovante_pagamento_crisma` (UTILITY): Recibo digital de quitação de mensalidades.
   - `lembrete_mensalidade_crisma` (UTILITY): Lembrete amigável de contribuição.
   - `comunicado_geral_crisma` (MARKETING): Avisos gerais e comunicados avulsos.
5. **Reagendamento Inteligente:**
   - Caso um template recém-submetido esteja em aprovação (erros 132000/132001), a mensagem é reagendada para 15 minutos sem falhar definitivamente.

### Ciclo de Execução:
```
[pg_cron a cada 2 min]
       │
       ▼
[Edge Function: processar-fila-whatsapp]
       │
       ├─ É horário comercial (08h às 20h Brasília)? ──(Não)──► Pausa até 08:00
       ├─ Limite diário (250) atingido hoje? ────────────(Sim)──► Pausa até amanhã
       │
       ▼
[Seleciona até 5 mensagens pendentes / reagendadas]
       │
       ▼
[Dispara via Meta Cloud API Oficial v21.0 com Template]
       │
       ├─ Sucesso ──────► Marca 'enviado' + Incrementa contador diário
       │                  Verifica se é o último do lote ➔ Notifica Coordenador
       │
       ├─ Template Pendente ➔ Reagenda para 15 minutos
       │
       └─ Erro de Rede/Meta ─► Reagenda até 3 tentativas antes de falha definitiva
```

---

## 🗄️ 6. Esquema do Banco de Dados (Supabase PostgreSQL)

| Tabela | Finalidade | Políticas RLS |
|---|---|---|
| `crismandos` | Dados dos alunos (id, nome, telefone, valor_mensal) | Pública (`anon` e `authenticated`) |
| `pagamentos` | Registro das contribuições (crismando_id, mes, ano, valor, data_pagamento) | Pública (`anon` e `authenticated`) |
| `codigos_autenticacao` | Códigos únicos de 8 caracteres para validação de comprovantes | Pública (`anon` e `authenticated`) |
| `usuarios_autenticados` | Contas de login dos coordenadores (email, senha_hash, salt, tentativas) | Restrita via `auth.js` |
| `encontros` | Datas e temas dos encontros de catequese | Pública |
| `presencas` | Presenças/faltas de cada crismando por encontro | Pública |
| `despesas_crisma` | Gastos e saídas do livro caixa | Pública |
| `entradas_extras_crisma` | Taxas e doações do livro caixa | Pública |
| `configuracoes_sistema` | JSON com ciclo catequético e `telefone_coordenador` | Pública (`Permitir tudo`) |
| `fila_mensagens_whatsapp` | Fila de envio (lote_id, tipo_envio, telefone, mensagem, dados_template, status, prioridade) | Pública (`Permitir tudo`) |
| `controle_envios_diarios` | Contador diário de envios (limite 250) | Pública (`Permitir tudo`) |

---

## 🤖 7. Regras Mandatórias para LLMs ao Modificar o Projeto

1. **Preserve a simplicidade (KISS & YAGNI):** Nunca sugira migração para React, Next.js, Vite ou Tailwind a menos que explicitamente ordenado pelo usuário. O projeto funciona via arquivos estáticos diretos.
2. **Preserve a Experiência do Usuário (UX):**
   - Nunca altere a posição de botões existentes.
   - Sempre mantenha os botões `[Marcar Todos]`, `[Desmarcar Todos]` e checkboxes individuais onde houver seleção de contatos.
3. **Respeite o Banco e Paginação:** Ao buscar dados de `pagamentos`, sempre use busca paginada com `.range()` para superar o limite de 1000 registros do Supabase.
4. **Meta Cloud API Oficial Exclusiva:** Nunca reintroduza Evolution Go ou gateways não-oficiais. Todos os disparos utilizam a API oficial da Meta v21.0 com limite de 250 msgs/dia.
5. **Uso Rigoroso de Templates UTILITY para Faltas:** Jamais use `comunicado_geral_crisma` para faltas; use estritamente `aviso_ausencia_crisma` e `resumo_faltas_crisma`.
6. **Idioma Oficial:** Todo código de interface, comentários, mensagens de erro, alertas e relatórios devem ser em **Português do Brasil (PT-BR)**.
