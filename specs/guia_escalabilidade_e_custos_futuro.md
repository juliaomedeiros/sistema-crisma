# Guia de Arquitetura, Escalabilidade e Otimização de Custos — Sistema Crisma

> **Objetivo deste Documento:** Servir como manual técnico de referência futura caso o **Sistema Crisma** precise escalar para múltiplas turmas, outras pastorais (Batismo, Catequese Infantil, Dízimo, etc.) ou diversas paróquias e dioceses, garantindo **isolamento total dos dados**, **alta performance** e **o menor custo financeiro possível** — mantendo **100% das funcionalidades atuais** sem precisar reescrever o sistema.

---

## 📊 1. Diagnóstico do Cenário Atual (Supabase Cloud Free — R$ 0,00/mês)

Graças às decisões arquiteturais já aplicadas no projeto (**Vanilla JS no navegador**, **armazenamento exclusivo de texto no Chat** e **expurgo automático de 45 dias**), o consumo de recursos no servidor é extremamente baixo.

### Matemática Real de Consumo vs. Limites Gratuitos do Supabase:

| Recurso no Supabase Free | Limite Gratuito Oficial | Consumo Atual (1 Turma ~180 Crismandos) | Capacidade Máxima no Plano Free |
| :--- | :--- | :--- | :--- |
| **Banco de Dados (PostgreSQL)** | **500 MB** | **~3 MB / ano** (cada linha de pagamento, presença ou mensagem de texto ocupa ~250 a 350 bytes) | Suporta **+1.200.000 registros** (**~100 turmas** ou **~18.000 alunos**) |
| **Edge Functions (Invocações)** | **500.000 / mês** | **~21.600 / mês** (`pg_cron` a cada 2 min + webhooks + disparos) = **4,3% da cota** | Aguenta crescer **23x** em volume de execuções sem custo |
| **Realtime (WebSocket do Chat)** | **200 conexões simultâneas** e **2.000.000 msgs/mês** | **2 a 10 coordenadores** simultâneos | Suporta **200 coordenadores** com a aba Chat aberta ao mesmo tempo |
| **Pausa por Inatividade (7 dias)** | Pausa após 7 dias sem requisições | **Risco Zero** (o `pg_cron` aciona o banco a cada 2 minutos todos os dias) | O projeto nunca entra em hibernação |

### Otimizações Extras Gratuitas (Quando desejar economizar ainda mais cota no Free):
1. **Horário Comercial no `pg_cron`:** Ajustar o cron do worker para disparar apenas entre 08h e 20h reduz as chamadas mensais de Edge Functions de `21.600` para **`10.800/mês` (apenas 2,1% da cota gratuita)**.
2. **Expurgo de Logs Antigos da Fila (180 dias):** Assim como o Chat limpa mensagens com mais de 45 dias, adicionar uma limpeza automática na tabela `fila_mensagens_whatsapp` para registros com mais de 180 dias garante que o banco **nunca ultrapasse ~30 MB** mesmo após 10 anos de uso contínuo.
3. **Cloudflare Workers Free (Opcional):** Caso o volume de Webhooks do WhatsApp cresça para centenas de milhares por mês, as Edge Functions (`webhook-whatsapp` e `enviar-whatsapp`) podem rodar no **Cloudflare Workers Gratuito**, que oferece **100.000 requisições grátis por dia (3.000.000/mês)** usando o mesmo código TypeScript.

---

## 🏗️ 2. Como Escalar para Outras Pastorais e Paróquias (Sem Misturar Dados e Sem Pagar os US$ 25/mês do Supabase Pro)

O plano pago do Supabase Cloud custa **US$ 25/mês (~R$ 145/mês)** por projeto. Se o sistema crescer ou se outras pastorais e paróquias quiserem utilizá-lo **sem misturar dados financeiros, alunos ou conversas**, existem **3 caminhos arquiteturais** de baixíssimo custo (ou custo zero):

---

### Opção A: Isolamento por Conta Gratuita (1 a 5 Pastorais/Paróquias — Custo: R$ 0,00/mês)
- **Como funciona:** Cada paróquia ou pastoral cria sua própria conta gratuita no Supabase Cloud (usando o e-mail da própria pastoral/paróquia) e recebe seus próprios **500 MB de banco + 500.000 chamadas de Edge Functions**.
- **Como configurar:** O código do site é 100% o mesmo. Basta apontar o `env.js` de cada pastoral para a respectiva `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- **Vantagem:** Custo R$ 0,00, zero manutenção de servidor Linux e isolamento físico total entre as paróquias.

---

### Opção B (VPS — Forma 1): Supabase Self-Hosted com Coolify via Containers Individuais
*Ideal para **VPS com bastante Memória RAM** (ex: **Oracle Cloud Always Free com 24 GB RAM a R$ 0,00/mês** ou **VPS Hetzner de 8 GB a 16 GB RAM**).*

Como o Supabase é **100% Open Source**, você pode instalar o gerenciador **Coolify** em uma VPS Linux e subir instâncias completas e independentes do Supabase com 2 cliques.

#### Como funciona na prática:
1. No painel do **Coolify**, você clica em **`+ Add Resource` -> `Supabase`** para cada paróquia ou pastoral:
   - **Pastoral da Crisma:** `https://api-crisma.seudominio.com` (Container Postgres 1 + Chaves 1 + WhatsApp 1)
   - **Pastoral do Batismo:** `https://api-batismo.seudominio.com` (Container Postgres 2 + Chaves 2 + WhatsApp 2)
   - **Paróquia São José:** `https://api-paroquiasaojose.seudominio.com` (Container Postgres 3 + Chaves 3 + WhatsApp 3)
2. **Isolamento:** É um isolamento físico de containers Docker. Cada pastoral tem seu próprio banco PostgreSQL, seu próprio painel Supabase Studio e suas próprias chaves.
3. **Impacto no código atual:** **Zero.** O sistema não sofre nenhuma alteração de código; apenas o arquivo `env.js` de cada site aponta para a URL do respectivo container.
4. **Ponto de Atenção (Consumo de RAM):**
   - Cada instância completa do Supabase Self-Hosted (Postgres + Kong + PostgREST + GoTrue + Realtime + Edge Runtime + Studio) consome cerca de **1,5 GB a 2 GB de memória RAM**.
   - Portanto, uma VPS de 4 GB RAM comporta apenas 1 instância; para rodar 5 a 8 instâncias separadas, recomenda-se uma VPS de **12 GB a 24 GB de RAM**.

---

### Opção C (VPS — Forma 2): Supabase Self-Hosted com Isolamento por *Schemas* do PostgreSQL ⭐ *(Melhor Custo-Benefício para Dezenas de Pastorais)*
*Ideal para rodar **10, 30 ou 50 pastorais/paróquias** dentro de **1 única VPS barata (ex: Hetzner Cloud CAX11 / CX22 de 4 GB RAM por ~R$ 24/mês)** sem gastar memória RAM extra e **sem misturar nenhuma tabela**.*

#### Como funciona a Arquitetura por *Schemas*:
Em vez de subir vários containers pesados do Supabase, você sobe **apenas 1 instância do Supabase Self-Hosted** no Coolify (consumindo apenas ~2 GB de RAM) e utiliza o recurso nativo de **Schemas Independentes** do PostgreSQL:

```
                 [ 1 Única VPS com Coolify + 1 Supabase ]
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
[Schema: crisma_mr]       [Schema: batismo_mr]      [Schema: paroquia_sj]
- crismandos              - crismandos              - crismandos
- pagamentos              - pagamentos              - pagamentos
- presencas               - presencas               - presencas
- fila_whatsapp           - fila_whatsapp           - fila_whatsapp
- chat_whatsapp           - chat_whatsapp           - chat_whatsapp
        ▲                          ▲                          ▲
        └──────────────────────────┼──────────────────────────┘
                                   │
           [ 1 Único pg_cron + 3 Edge Functions Dinâmicas ]
        (Roteia cada envio/webhook pelo schema + META_PHONE_ID)
```

---

## ⚙️ 3. Detalhamento Técnico dos Gatilhos na Arquitetura por *Schemas* (Forma 2)

Para que a **Forma 2 (Schemas)** funcione com isolamento rigoroso entre todas as pastorais e paróquias, veja como cada componente opera:

### 3.1. Conexão do Frontend (`js/supabase-config.js`)
O SDK oficial `@supabase/supabase-js@2` aceita nativamente o nome do schema na inicialização. Basta adicionar 1 propriedade:
```javascript
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: (typeof ENV !== 'undefined' && ENV.PASTORAL_SCHEMA) ? ENV.PASTORAL_SCHEMA : 'public' }
});
```
- O site da Crisma usa `PASTORAL_SCHEMA: 'crisma_mae_rainha'`.
- O site do Batismo usa `PASTORAL_SCHEMA: 'batismo_mae_rainha'`.
- Nenhum código das abas (`data.js`, `frequencia.js`, `financeiro.js`, `utils.js`) precisa ser refatorado, pois todas as consultas `.from('crismandos')`, `.from('pagamentos')` já serão direcionadas automaticamente para a gaveta (schema) certa!

### 3.2. Tabela Central de Roteamento (`public.roteamento_pastorais`)
No schema `public`, cria-se uma única tabela administrativa leve para guardar as credenciais da Meta de cada pastoral/paróquia:
| `schema_nome` | `nome_pastoral` | `meta_phone_id` | `meta_access_token` | `ativo` |
| :--- | :--- | :--- | :--- | :--- |
| `crisma_mae_rainha` | Crisma Mãe Rainha | `1404501486069933` | `EAAG...` | `true` |
| `batismo_mae_rainha` | Batismo Mãe Rainha | `2293847561029384` | `EAAG...` | `true` |
| `paroquia_sao_jose` | Crisma São José | `3384756192837465` | `EAAG...` | `true` |

*Benefício financeiro:* Cada paróquia usa o seu próprio `meta_phone_id` e `meta_access_token`, garantindo que a fatura de mensagens da Meta seja cobrada separadamente no cartão de cada paróquia.

### 3.3. Gatilho do Webhook da Meta (`webhook-whatsapp`)
Quando um crismando ou fiel responde no WhatsApp, a Meta envia no payload JSON do Webhook o campo `metadata.phone_number_id` (qual número da paróquia recebeu a mensagem):
1. A função `webhook-whatsapp` lê `value.metadata.phone_number_id`.
2. Consulta na tabela `public.roteamento_pastorais` a qual `schema_nome` pertence aquele `phone_number_id`.
3. Conecta no schema correspondente (`supabase.schema(schemaAlvo)`) e grava a mensagem diretamente na tabela `mensagens_chat_whatsapp` daquela pastoral!
4. *Caso duas pastorais da mesma paróquia compartilhem o mesmo número de WhatsApp:* O webhook verifica em qual dos schemas da paróquia aquele telefone de aluno está cadastrado e salva no chat correspondente.

### 3.4. Gatilho de Tempo Real do Chat (`supabase_realtime`)
O motor de WebSockets do Supabase permite publicar tabelas de múltiplos schemas:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE crisma_mae_rainha.mensagens_chat_whatsapp;
ALTER PUBLICATION supabase_realtime ADD TABLE batismo_mae_rainha.mensagens_chat_whatsapp;
ALTER PUBLICATION supabase_realtime ADD TABLE paroquia_sao_jose.mensagens_chat_whatsapp;
```
No arquivo `js/chat-whatsapp.js`, o filtro do canal Realtime usa `schema: ENV.PASTORAL_SCHEMA || "public"`. Assim, o celular do coordenador da Crisma recebe instantaneamente apenas as mensagens da Crisma, e o coordenador do Batismo recebe apenas as mensagens do Batismo.

### 3.5. Gatilho do `pg_cron` e Worker Paralelo (`processar-fila-whatsapp`)
Continua existindo **apenas 1 agendamento `pg_cron`** rodando a cada 2 minutos e **1 agendamento de limpeza** às 03h da manhã:
- **Na Limpeza de 45 Dias:** Uma função SQL percorre os schemas ativos e apaga as mensagens do chat com mais de 45 dias em cada um.
- **No Worker de Envios (`processar-fila-whatsapp`):** Lê os schemas ativos em `public.roteamento_pastorais` e processa o lote de até 5 mensagens de cada pastoral respeitando o `controle_envios_diarios` (teto de 250/dia) individual de cada schema.

---

## 🚀 4. Análise de Performance e Concorrência (Múltiplos Coordenadores Simultâneos)

### 4.1. Por que consultas em *Schemas* separados são extremamente rápidas?
- No PostgreSQL, separar por *Schemas* significa que cada pastoral tem **arquivos de tabela e índices B-Tree fisicamente separados e pequenos**.
- Quando o coordenador da *Crisma Mãe Rainha* registra um pagamento ou abre o relatório diário, o PostgreSQL consulta **apenas o índice de ~2.000 linhas daquela pastoral**, ignorando completamente os dados das outras 40 paróquias.
- O tempo de execução no banco permanece entre **1 ms e 3 ms**.

### 4.2. Como evitar fila de espera no Worker quando 30 paróquias disparam lotes ao mesmo tempo?
- **O Gargalo Sequencial (O que evitar):**
  - Cada lote de 5 mensagens leva ~3 segundos para ser entregue na API da Meta. Se o Worker usasse um loop sequencial (`for ... await`), 30 paróquias enviando juntas levariam `30 × 3s = 90 segundos`.
- **A Solução Moderna (Paralelismo com `Promise.allSettled`):**
  - No Deno/TypeScript, o Worker dispara o processamento de todos os schemas ativos **em paralelo**:
    ```typescript
    await Promise.allSettled(
      pastoraisAtivas.map((pastoral) => processarFilaDaPastoral(pastoral))
    );
    ```
  - Como o tempo de espera é de rede (aguardando o servidor da Meta responder) e cada paróquia tem seu próprio número, **processar 1 paróquia ou 30 paróquias simultaneamente leva os mesmos ~3 segundos!**

---

## 📋 5. Matriz Comparativa Final para Tomada de Decisão Futura

| Estágio de Crescimento | Quantidade de Pastorais / Paróquias | Coordenadores Simultâneos | Arquitetura Recomendada | Custo Mensal Estimado |
| :--- | :--- | :--- | :--- | :--- |
| **Estágio 1 (Atual)** | 1 Pastoral (até ~18.000 alunos acumulados) | Até 200 simultâneos | **1 Conta Supabase Cloud Free** (Arquitetura atual) | **R$ 0,00 / mês** |
| **Estágio 2 (Expansão Local)** | 2 a 5 Pastorais/Paróquias independentes | Até 200 por pastoral | **Multi-Conta Supabase Cloud Free** (1 conta gratuita para cada pastoral) | **R$ 0,00 / mês** |
| **Estágio 3 (Rede Paroquial / Regional)** | 5 a 60 Pastorais/Paróquias | 200 a 400 simultâneos | **VPS 4 GB–8 GB RAM + Coolify + 1 Supabase Self-Hosted com Isolamento por *Schemas*** (Forma 2) | **~R$ 24 a R$ 45 / mês** *(ou R$ 0 na Oracle Cloud Free)* |
| **Estágio 4 (Isolamento Físico Total em VPS Grande)** | 3 a 10 Paróquias com bancos 100% separados em Docker | 300 a 600 simultâneos | **VPS 16 GB–24 GB RAM + Coolify + Containers Supabase Individuais** (Forma 1) | **R$ 0,00 / mês** *(Oracle Free 24 GB)* ou **~R$ 85 / mês** *(Hetzner)* |
