# Escalabilidade

> Referência completa para decisões de escalabilidade em projetos de software.
> Aplica-se tanto a projetos greenfield quanto a sistemas legados que precisam crescer.

---

## Projetos Novos — Começar Simples, Preparar para Crescer

A tentação de todo projeto novo é construir para milhões de usuários no dia 1. **Resista.**
O objetivo é fazer escolhas que não bloqueiem o crescimento futuro, sem pagar o custo de complexidade antes de precisar.

### Abordagem por Aspecto

| Aspecto | Abordagem Inicial | Preparação para Crescer | Evitar no Dia 1 |
|---|---|---|---|
| **Arquitetura** | Monolito modular com separação clara de domínios | Boundaries bem definidos entre módulos (DDD) | Microsserviços prematuros |
| **Banco de Dados** | PostgreSQL/MySQL único, bem modelado | Índices planejados, migrations versionadas, sem queries N+1 | Múltiplos bancos, sharding |
| **API** | REST stateless com versionamento (`/api/v1/`) | Paginação cursor-based, rate limiting básico, HATEOAS | GraphQL complexo, gRPC interno |
| **Cache** | Cache em memória (in-process) para hot paths | Interface de cache abstraída para trocar provider depois | Redis cluster distribuído |
| **Filas** | Processos síncronos para operações rápidas | Extrair operações >500ms para background jobs | RabbitMQ/Kafka multi-cluster |
| **Frontend** | SPA ou SSR simples, bundle único | Code splitting por rota, lazy loading de imagens | Micro-frontends, Module Federation |
| **Infra** | Docker Compose local, deploy em cloud simples | Dockerfile otimizado, CI/CD desde dia 1 | Kubernetes multi-cluster |
| **Observabilidade** | Logs estruturados (JSON), health checks | Métricas básicas (latência, erros, throughput) | Stack completa de APM distribuído |

### Arquitetura Monolito Modular

```
┌─────────────────────────────────────────────────┐
│                  MONOLITO MODULAR                │
│                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Módulo    │  │  Módulo    │  │  Módulo    │  │
│  │  Usuários  │  │  Pedidos   │  │  Pagamento │  │
│  │           │  │           │  │           │   │
│  │ - routes  │  │ - routes  │  │ - routes  │   │
│  │ - service │  │ - service │  │ - service │   │
│  │ - repo    │  │ - repo    │  │ - repo    │   │
│  │ - models  │  │ - models  │  │ - models  │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │           │
│  ┌─────┴──────────────┴──────────────┴─────┐    │
│  │         Camada de Infraestrutura         │    │
│  │   (DB, Cache, Logging, Auth, Config)     │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Exemplo: Estrutura de Pastas (Node.js/NestJS)

```
src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── users.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── orders/
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   └── ...
│   └── payments/
│       └── ...
├── shared/
│   ├── database/
│   ├── cache/
│   ├── auth/
│   └── logging/
├── config/
└── main.ts
```

### Exemplo: Estrutura de Pastas (Python/Django)

```
project/
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── urls.py
│   │   └── tests/
│   ├── orders/
│   └── payments/
├── core/
│   ├── middleware/
│   ├── cache/
│   └── utils/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   └── urls.py
└── manage.py
```

### APIs Stateless desde o Dia 1

```python
# ❌ ERRADO — Estado no servidor
user_sessions = {}  # dict em memória

@app.route('/api/data')
def get_data():
    session = user_sessions.get(request.cookies['session_id'])
    if not session:
        return 401
    return fetch_data(session['user_id'])

# ✅ CORRETO — Stateless com JWT
@app.route('/api/data')
def get_data():
    token = request.headers.get('Authorization')  # Bearer <jwt>
    payload = jwt.decode(token, SECRET_KEY)        # Estado no token
    return fetch_data(payload['user_id'])
```

**Por que stateless?** Qualquer instância do servidor pode atender qualquer requisição. Isso permite:
- Load balancing round-robin trivial
- Auto-scaling horizontal sem sessão sticky
- Deploy zero-downtime com rolling updates

### Regra de Ouro

> **Não construa para 1 milhão de usuários no dia 1, mas não faça escolhas que impeçam chegar lá.**
>
> Pergunte-se: "Se precisar escalar este componente em 6 meses, quanto precisarei reescrever?"
> Se a resposta for "tudo", revise a decisão. Se for "trocar uma implementação", está correto.

---

## Projetos Existentes — Identificar o Gargalo Real

O erro mais comum em projetos existentes é escalar o componente errado. Antes de qualquer ação, **meça**.

### Fluxo de Diagnóstico

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MEDIR      │───▶│  IDENTIFICAR │───▶│   RESOLVER   │───▶│   MEDIR      │
│              │    │   GARGALO    │    │              │    │  DE NOVO     │
│ - APM        │    │              │    │ - Otimizar   │    │              │
│ - Profiling  │    │ - DB lento?  │    │ - Cachear    │    │ - Melhorou?  │
│ - Métricas   │    │ - CPU alta?  │    │ - Escalar    │    │ - Novo       │
│ - Logs       │    │ - Memória?   │    │ - Reescrever │    │   gargalo?   │
│              │    │ - Rede?      │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │   REPETIR    │
                                                           │   até atingir│
                                                           │   o objetivo │
                                                           └──────────────┘
```

### Abordagem por Gargalo

| Gargalo | Sinais | Diagnóstico | Solução Imediata | Solução Estrutural |
|---|---|---|---|---|
| **Banco de dados** | Latência alta em queries, CPU do DB >70% | `EXPLAIN ANALYZE`, slow query log, pg_stat_statements | Índices, otimizar top 10 queries | Read replicas, connection pooling (PgBouncer), CQRS |
| **Queries N+1** | Muitas queries idênticas por request | APM (NewRelic, Datadog), SQL logs | Eager loading, JOINs | Reestruturar camada de acesso a dados |
| **Memória** | OOM kills, swap alto, GC pauses | `htop`, `free -m`, GC logs, heap dumps | Aumentar RAM temporariamente | Profiling de memória, corrigir leaks, streaming |
| **CPU** | Utilização >80% sustentada | `top`, flame graphs, profiling | Scale up temporário | Otimizar hot paths, offload para filas |
| **API sobrecarregada** | Timeout 5xx, latência crescente | Métricas de RPS, error rate | Rate limiting, cache de responses | Load balancer, auto-scaling horizontal |
| **Frontend lento** | LCP >2.5s, bundle >500KB | Lighthouse, Chrome DevTools, Web Vitals | Lazy loading, compressão gzip/brotli | Code splitting, CDN, SSR/SSG |
| **Processos pesados** | Request timeout, usuário esperando | APM, logs de duração | Aumentar timeout (paliativo) | Filas assíncronas (RabbitMQ, SQS, Bull) |
| **Monolito inchado** | Deploy de 30min+, equipe se atrapalhando | Tempo de build/deploy, conflitos de merge | Feature flags, deploys parciais | Strangler Fig Pattern, extrair serviços |
| **Conexões esgotadas** | "Too many connections", connection timeout | `SHOW PROCESSLIST`, pool metrics | Aumentar max_connections | Connection pooling (PgBouncer, ProxySQL) |

### Diagnóstico: Ferramentas por Camada

| Camada | Ferramenta | Comando / Configuração | O que mostra |
|---|---|---|---|
| **Sistema** | htop | `htop` | CPU, memória, processos em tempo real |
| **Sistema** | vmstat | `vmstat 1 10` | CPU, I/O, swap a cada 1s por 10s |
| **Banco (PostgreSQL)** | pg_stat_statements | `SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;` | Top 10 queries mais lentas |
| **Banco (PostgreSQL)** | EXPLAIN ANALYZE | `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;` | Plano de execução real da query |
| **Banco (MySQL)** | Slow Query Log | `SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 1;` | Queries que demoram mais de 1s |
| **Aplicação (Node.js)** | clinic.js | `npx clinic doctor -- node server.js` | Flame graph, event loop lag |
| **Aplicação (Python)** | py-spy | `py-spy top --pid <PID>` | Profiling em tempo real sem parar o processo |
| **Aplicação (Java)** | async-profiler | `./profiler.sh -d 30 -f flame.html <PID>` | Flame graph de CPU e alocação |
| **HTTP** | k6 | `k6 run load-test.js` | Load testing com métricas detalhadas |
| **Frontend** | Lighthouse | Chrome DevTools → Lighthouse | Performance, acessibilidade, best practices |
| **APM** | Datadog / NewRelic | Agent instalado na aplicação | Traces distribuídos, métricas, alertas |
| **Infra** | Prometheus + Grafana | Exporters nos serviços + dashboards | Métricas customizadas, alertas |

### Exemplo: Otimizando Top 10 Queries no PostgreSQL

```sql
-- 1. Habilitar pg_stat_statements (postgresql.conf)
-- shared_preload_libraries = 'pg_stat_statements'

-- 2. Encontrar as queries mais lentas
SELECT
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 3. Analisar a query mais lenta
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.*, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC;

-- 4. Criar índice baseado no plano de execução
CREATE INDEX CONCURRENTLY idx_orders_status_created
ON orders (status, created_at DESC)
WHERE status = 'pending';

-- 5. Verificar melhoria
-- Rodar o EXPLAIN ANALYZE novamente e comparar tempos
```

### Exemplo: Adicionando Cache com Redis (Node.js)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Padrão Cache-Aside
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // 1. Tentar cache primeiro
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Buscar no banco se não estiver em cache
  const user = await db.users.findById(userId);

  // 3. Salvar no cache com TTL de 5 minutos
  await redis.setex(cacheKey, 300, JSON.stringify(user));

  return user;
}

// Invalidar cache ao atualizar
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const user = await db.users.update(userId, data);

  // Invalidar cache após escrita
  await redis.del(`user:${userId}`);

  return user;
}
```

### Exemplo: Extraindo Processo Pesado para Fila (Bull + Redis)

```typescript
import Queue from 'bull';

// Definir a fila
const emailQueue = new Queue('email-sending', process.env.REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Antes: Síncrono (bloqueia o request por 3-5s)
// app.post('/api/orders', async (req, res) => {
//   const order = await createOrder(req.body);
//   await sendConfirmationEmail(order);       // ← 3s bloqueado aqui
//   await generateInvoicePDF(order);          // ← mais 2s bloqueado
//   res.json(order);
// });

// Depois: Assíncrono (responde em <100ms)
app.post('/api/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Enfileirar tarefas pesadas
  await emailQueue.add('confirmation', { orderId: order.id });
  await emailQueue.add('invoice', { orderId: order.id });

  res.status(201).json(order);  // Responde imediatamente
});

// Worker processa em background
emailQueue.process('confirmation', async (job) => {
  const order = await getOrder(job.data.orderId);
  await sendConfirmationEmail(order);
});

emailQueue.process('invoice', async (job) => {
  const order = await getOrder(job.data.orderId);
  await generateInvoicePDF(order);
});
```

### Regra de Ouro

> **Medir → Encontrar o Gargalo → Resolver → Medir de Novo.**
>
> Se você não mediu, você não sabe onde está o problema.
> O gargalo raramente está onde você acha que está.

---

## Padrões de Escalabilidade

### Visão Geral

```
                    COMPLEXIDADE CRESCENTE →

  Simples                                              Complexo
    │                                                      │
    ▼                                                      ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Vertical│ │  CDN   │ │ Cache  │ │  Read  │ │  CQRS  │ │Sharding│
│Scaling │ │        │ │Distrib.│ │Replicas│ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Horizont│ │  BFF   │ │Strangl.│ │ Event  │ │  Saga  │ │  DB    │
│Scaling │ │        │ │  Fig   │ │Sourcing│ │Pattern │ │per Svc │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### Tabela Detalhada

| Padrão | O que é | Quando usar | Complexidade | Exemplo Real |
|---|---|---|---|---|
| **Horizontal Scaling** | Adicionar mais instâncias da mesma aplicação atrás de um load balancer | Request volume crescente, CPU distribuída entre instâncias | ⭐ Baixa | 3 instâncias do Node.js atrás de um NGINX ou ALB. Auto-scaling group na AWS de 2→10 instâncias |
| **Vertical Scaling** | Aumentar CPU/RAM/Disco da máquina existente | Gargalo pontual, banco de dados (que é difícil de distribuir), solução rápida temporária | ⭐ Baixa | Trocar de `t3.medium` (2 vCPU, 4GB) para `t3.xlarge` (4 vCPU, 16GB) na AWS |
| **Read Replicas** | Cópias read-only do banco principal, escritas vão para o primário | Aplicações com ratio leitura/escrita > 10:1 (maioria dos apps web) | ⭐⭐ Média | PostgreSQL com 1 primário + 2 réplicas. Reads na réplica, writes no primário via PgBouncer |
| **CQRS** | Separar modelos de leitura (Query) e escrita (Command) em modelos/bancos diferentes | Leituras e escritas têm requisitos muito diferentes, relatórios complexos | ⭐⭐⭐ Alta | Escrita em PostgreSQL normalizado, leitura em Elasticsearch desnormalizado para buscas complexas |
| **Event-Driven** | Componentes se comunicam via eventos assíncronos em vez de chamadas diretas | Desacoplamento entre serviços, processamento assíncrono, audit trail | ⭐⭐ Média | Pedido criado → evento `OrderCreated` → serviço de estoque, email e faturamento reagem independentemente |
| **Event Sourcing** | Armazenar todos os eventos em sequência ao invés do estado atual | Audit trail obrigatório, desfazer operações, reconstruir estado em qualquer ponto no tempo | ⭐⭐⭐⭐ Muito Alta | Conta bancária armazena cada transação (débito/crédito). Saldo é calculado pela soma dos eventos |
| **Cache Distribuído** | Cache compartilhado entre múltiplas instâncias (Redis, Memcached) | Múltiplas instâncias precisam acessar o mesmo cache, dados quentes repetidos | ⭐⭐ Média | Redis cluster com dados de sessão, catálogo de produtos e resultados de queries frequentes |
| **CDN** | Distribuir conteúdo estático em servidores geograficamente próximos do usuário | Assets estáticos (JS, CSS, imagens), conteúdo semi-estático, APIs públicas de leitura | ⭐ Baixa | CloudFront/Cloudflare servindo assets do frontend, imagens de produto, vídeos |
| **Sharding** | Dividir dados do banco entre múltiplas instâncias por uma chave de partição | Banco único não suporta mais o volume de dados/escritas (bilhões de registros) | ⭐⭐⭐⭐ Muito Alta | Shard por `tenant_id` — tenant A vai para DB1, tenant B para DB2. Cada shard tem ~1/N dos dados |
| **Strangler Fig** | Migrar um monolito gradualmente, substituindo funcionalidades por novos serviços um a um | Monolito legado que precisa ser modernizado sem big-bang rewrite | ⭐⭐⭐ Alta | Extrair módulo de pagamentos do monolito PHP para um serviço Go, proxy redireciona `/api/payments` |
| **BFF (Backend for Frontend)** | API gateway específica para cada tipo de cliente (web, mobile, IoT) | Clientes com necessidades muito diferentes (mobile precisa de payloads menores) | ⭐⭐ Média | BFF Web retorna dados completos, BFF Mobile retorna dados otimizados/comprimidos |
| **Edge Computing** | Executar lógica nos CDN nodes mais próximos do usuário | Personalização por região, A/B testing, autenticação, redirecionamentos | ⭐⭐ Média | Cloudflare Workers fazendo autenticação JWT e rate limiting no edge, sem ir ao origin server |
| **Database per Service** | Cada microsserviço tem seu próprio banco de dados, sem acesso direto ao banco de outro serviço | Microsserviços com domínios bem definidos que precisam de autonomia total | ⭐⭐⭐ Alta | Serviço de Usuários usa PostgreSQL, Serviço de Busca usa Elasticsearch, Serviço de Sessões usa Redis |
| **Saga Pattern** | Coordenar transações distribuídas entre múltiplos serviços via sequência de transações locais + compensações | Operações que envolvem múltiplos serviços e precisam de consistência eventual | ⭐⭐⭐⭐ Muito Alta | Criar pedido → reservar estoque → cobrar pagamento. Se pagamento falhar → compensar estoque → cancelar pedido |

### Horizontal Scaling — Detalhamento

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │   (NGINX /   │
                    │    ALB)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ App #1   │ │ App #2   │ │ App #3   │
        │ (Node.js)│ │ (Node.js)│ │ (Node.js)│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Primário)  │
                    └──────────────┘
```

**Pré-requisitos para funcionar:**
- Aplicação **stateless** (sem sessão em memória)
- Sessões em store externo (Redis, banco)
- Uploads de arquivos em storage externo (S3, MinIO)
- Health check endpoint (`GET /health`)

### CQRS — Detalhamento

```
  Escrita (Command)                    Leitura (Query)
  ─────────────────                    ─────────────────
  ┌─────────────┐                      ┌─────────────┐
  │  API Write  │                      │  API Read   │
  └──────┬──────┘                      └──────┬──────┘
         │                                    │
         ▼                                    ▼
  ┌─────────────┐    Sync/Event     ┌─────────────────┐
  │ PostgreSQL  │ ──────────────▶   │  Elasticsearch  │
  │ (normalizado│    Projeção       │ (desnormalizado, │
  │  para write)│                   │ otimizado p/read)│
  └─────────────┘                   └─────────────────┘
```

### Strangler Fig — Detalhamento

```
Fase 1: Proxy na frente          Fase 2: Extrair serviço
─────────────────────────        ──────────────────────────

┌────────┐  ┌──────────┐        ┌────────┐  ┌──────────┐
│ Proxy  │─▶│ Monolito │        │ Proxy  │─┬▶│ Monolito │ (sem pagamentos)
│(NGINX) │  │  (tudo)  │        │(NGINX) │ │ └──────────┘
└────────┘  └──────────┘        └────────┘ │
                                           │ /api/payments
                                           └▶┌──────────┐
                                             │ Serviço  │
                                             │Pagamentos│
                                             └──────────┘

Fase 3: Mais serviços            Fase 4: Monolito eliminado
──────────────────────           ────────────────────────────

┌────────┐  ┌──────────┐        ┌────────┐  ┌──────────┐
│ Proxy  │─┬▶│ Monolito │ (menor)│ Proxy  │─┬▶│ Usuários │
│(NGINX) │ │ └──────────┘        │ (API   │ ├▶│ Pedidos  │
└────────┘ ├▶┌──────────┐        │Gateway)│ ├▶│Pagamentos│
           │ │Pagamentos│        └────────┘ └▶│ Estoque  │
           └▶│ Estoque  │                     └──────────┘
             └──────────┘
```

### Saga Pattern — Detalhamento

```
 Saga de Criação de Pedido (Coreografia)
 ─────────────────────────────────────────

 ┌──────────┐    OrderCreated     ┌──────────┐    StockReserved    ┌──────────┐
 │  Pedido  │ ──────────────────▶ │ Estoque  │ ──────────────────▶ │Pagamento │
 │          │                     │          │                     │          │
 └──────────┘                     └──────────┘                     └──────────┘
                                        │                                │
                                        │ StockFailed                    │ PaymentFailed
                                        ▼                                ▼
                                  ┌──────────┐                     ┌──────────┐
                                  │ Cancelar │                     │ Liberar  │
                                  │  Pedido  │                     │ Estoque  │
                                  └──────────┘                     └──────────┘

 Fluxo feliz: Pedido → Reservar Estoque → Cobrar → Confirmar
 Compensação: Se pagamento falha → Liberar Estoque → Cancelar Pedido
```

---

## Anti-patterns de Escalabilidade

### Lista Detalhada

| Anti-pattern | O que é | Por que é ruim | O que fazer em vez disso |
|---|---|---|---|
| **Otimização prematura** | Otimizar performance antes de ter dados reais de uso e métricas | Gasta tempo e dinheiro resolvendo problemas que não existem. Aumenta complexidade desnecessariamente. "Premature optimization is the root of all evil" — Knuth | Medir primeiro. Otimizar apenas quando métricas provarem o gargalo. Usar profiling, não intuição |
| **Microsserviços desde o dia 1** | Começar um projeto novo já com 15 microsserviços, Kubernetes, service mesh, etc. | Overhead operacional absurdo para equipe pequena. Latência de rede entre serviços. Complexidade de deploy, debugging e tracing distribuído | Monolito modular com boundaries claros. Extrair microsserviços quando a dor for real (escala, equipe grande, deploy independente) |
| **Escalar vertical infinitamente** | Resolver todo problema de performance comprando máquina maior | Custo cresce exponencialmente. Existe um teto físico. Ponto único de falha. Não resolve problemas arquiteturais | Usar vertical scaling como medida temporária. Planejar horizontal scaling. Resolver a causa raiz (queries ruins, memory leaks) |
| **Ignorar o banco de dados** | Escalar aplicação horizontal sem olhar para o banco, que é o gargalo real | O banco vira ponto único de falha e gargalo. Mais instâncias = mais conexões = banco mais sobrecarregado | Connection pooling (PgBouncer), read replicas, otimizar queries, índices adequados, cache na frente do banco |
| **Cache sem invalidação** | Cachear tudo mas nunca invalidar ou ter TTL muito longo | Dados stale servidos ao usuário. Bugs difíceis de reproduzir ("funciona se limpar o cache"). Inconsistência de dados | TTL adequado por tipo de dado. Invalidação explícita on write. Cache-aside pattern. Monitorar hit/miss ratio |
| **Reescrever tudo por performance** | "Vamos reescrever em Go/Rust que vai ficar 10x mais rápido" | O gargalo quase nunca é a linguagem. É I/O (banco, rede, disco). Reescrever leva meses/anos. Bugs novos. Perda de conhecimento do sistema | Profiling para encontrar o gargalo real. Otimizar queries, cache, filas. Se realmente for CPU-bound, reescrever apenas o hot path |
| **Shared database entre microsserviços** | Múltiplos microsserviços acessam e modificam as mesmas tabelas do mesmo banco | Acoplamento total. Mudança de schema quebra todos os serviços. Impossível escalar ou fazer deploy independente. Não é microsserviço, é monolito distribuído | Cada serviço tem seu banco. Comunicação via APIs ou eventos. Se precisar de dados de outro serviço, perguntar via API |
| **Distributed monolith** | Microsserviços que precisam ser deployados juntos, têm chamadas síncronas em cadeia, compartilham models/libs | Tem toda a complexidade de microsserviços sem nenhum benefício. Pior que monolito. Latência de rede sem ganho de independência | Se precisa ser deployado junto, é monolito — aceite. Se quer microsserviços, garanta independência real: deploy, banco, equipe |

### Teste de Sanidade: "Você tem um Distributed Monolith?"

Responda sim ou não:

```
[ ] Para fazer deploy do Serviço A, preciso fazer deploy do Serviço B junto?
[ ] Serviços compartilham o mesmo banco de dados?
[ ] Serviço A chama Serviço B que chama Serviço C sincronamente?
[ ] Existe uma biblioteca compartilhada com models/DTOs entre serviços?
[ ] Se o Serviço B cai, o Serviço A também falha completamente?
[ ] Todos os serviços são deployados pela mesma equipe?

Se respondeu SIM a 3 ou mais: você provavelmente tem um distributed monolith.
Solução: consolidar de volta em monolito modular OU refatorar para independência real.
```

---

## Métricas de Escalabilidade

### O Que Medir

| Métrica | O que é | Valor Saudável | Valor de Alerta | Valor Crítico | Como medir |
|---|---|---|---|---|---|
| **Latência p50** | Mediana — 50% das requests são mais rápidas | < 100ms | 100-500ms | > 500ms | APM (Datadog, NewRelic), Prometheus histogram |
| **Latência p95** | 95% das requests são mais rápidas | < 300ms | 300ms-1s | > 1s | APM, Prometheus `histogram_quantile(0.95, ...)` |
| **Latência p99** | 99% das requests são mais rápidas (cauda) | < 1s | 1-3s | > 3s | APM, Prometheus `histogram_quantile(0.99, ...)` |
| **Throughput (RPS)** | Requests por segundo que o sistema sustenta | Depende do baseline | Queda >20% do baseline | Queda >50% do baseline | `rate(http_requests_total[5m])` |
| **Error Rate** | % de requests com erro (4xx/5xx) | < 0.1% | 0.1-1% | > 1% | `rate(http_errors_total[5m]) / rate(http_requests_total[5m])` |
| **CPU Utilization** | % de uso de CPU | < 60% | 60-80% | > 80% | `node_cpu_seconds_total`, CloudWatch, `top` |
| **Memory Utilization** | % de uso de memória | < 70% | 70-85% | > 85% | `node_memory_MemAvailable_bytes`, `free -m` |
| **DB Connections** | Conexões ativas ao banco | < 50% do max | 50-80% do max | > 80% do max | `pg_stat_activity`, `SHOW PROCESSLIST` |
| **DB Query Time (p95)** | Tempo da query no percentil 95 | < 50ms | 50-200ms | > 200ms | `pg_stat_statements`, slow query log |
| **Queue Depth** | Quantidade de mensagens pendentes na fila | < 100 (depende do SLA) | Crescendo consistentemente | Crescendo sem consumir | Métricas do RabbitMQ/SQS/Bull Dashboard |
| **Queue Lag** | Tempo entre produção e consumo da mensagem | < 5s (depende do SLA) | 5-30s | > 30s | Consumer lag metrics |
| **Cache Hit Rate** | % de requests servidas do cache | > 80% | 60-80% | < 60% | Redis `INFO stats` → `keyspace_hits / (hits+misses)` |
| **Apdex Score** | Índice de satisfação do usuário (0 a 1) | > 0.9 | 0.7-0.9 | < 0.7 | APM (NewRelic), cálculo sobre latência |

### Percentis de Latência Explicados

```
Distribuição de latência de 1000 requests:

  Requests
     │
  150│    ██
     │   ████
  100│  ██████
     │ ████████
   50│██████████       ██
     │████████████   ██████         ██
     │██████████████████████████████████████
     └──────────────────────────────────────── Tempo (ms)
     0   50  100  150  200  500  1000  3000

     p50 = 100ms   ← Metade das requests levam até 100ms
     p95 = 500ms   ← 95% das requests levam até 500ms
     p99 = 3000ms  ← 99% das requests levam até 3s (a "cauda")

     ⚠️  Se você só olhar a média (ex: 180ms), ignora que 1% dos seus
         usuários estão esperando 3 segundos. Sempre monitore p95 e p99.
```

### Exemplo: Dashboard Prometheus + Grafana

```yaml
# prometheus.yml - Configuração básica
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

```promql
# Queries PromQL essenciais para o dashboard

# Latência p95 por endpoint
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)
)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Throughput (RPS)
sum(rate(http_requests_total[5m]))

# CPU utilization
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory utilization
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# PostgreSQL active connections
pg_stat_activity_count{state="active"}

# Redis hit rate
rate(redis_keyspace_hits_total[5m])
/
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

### Alertas Recomendados

```yaml
# alerting_rules.yml
groups:
  - name: escalabilidade
    rules:
      - alert: LatenciaAlta
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latência p95 acima de 1s por 5 minutos"

      - alert: ErrorRateAlto
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate acima de 1%"

      - alert: CPUAlta
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU acima de 80% por 10 minutos"

      - alert: MemoriaAlta
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memória acima de 85%"

      - alert: ConexoesBancoCritico
        expr: pg_stat_activity_count{state="active"} / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Conexões ativas acima de 80% do máximo"

      - alert: FilaCrescendo
        expr: delta(queue_messages_total[15m]) > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Fila crescendo consistentemente por 15 minutos"
```

---

## Checklist de Escalabilidade

Use este checklist para avaliar a preparação de um projeto para crescer.

### Infraestrutura

```
[ ] Aplicação containerizada (Docker)
[ ] CI/CD pipeline configurado e funcionando
[ ] Health check endpoint implementado (GET /health)
[ ] Readiness e liveness probes configurados
[ ] Auto-scaling configurado (CPU > 70% → nova instância)
[ ] Load balancer na frente das instâncias
[ ] Logs centralizados (ELK, CloudWatch Logs, Datadog)
[ ] Métricas de infra sendo coletadas (Prometheus, CloudWatch)
[ ] Alertas configurados para CPU, memória, disco
[ ] Backups automatizados e testados
[ ] Disaster recovery documentado e testado
```

### Aplicação

```
[ ] API é stateless (sem sessão em memória)
[ ] Sessões armazenadas externamente (Redis, banco)
[ ] Uploads de arquivos em storage externo (S3, MinIO)
[ ] Variáveis de ambiente para todas as configs
[ ] Graceful shutdown implementado
[ ] Request timeout configurado
[ ] Rate limiting implementado
[ ] Paginação em todos os endpoints de listagem
[ ] Sem queries N+1 nos hot paths
[ ] Processos pesados (>500ms) executados em filas
[ ] Circuit breaker para chamadas externas
[ ] Retry com backoff exponencial para operações falíveis
```

### Banco de Dados

```
[ ] Índices criados para todas as queries frequentes
[ ] Queries lentas monitoradas (slow query log / pg_stat_statements)
[ ] Connection pooling configurado (PgBouncer, ProxySQL)
[ ] Migrations versionadas e automatizadas
[ ] Sem queries SELECT * em produção
[ ] Sem queries N+1 (usar JOINs ou eager loading)
[ ] Read replica configurada (se leitura >> escrita)
[ ] Backup automatizado e testado (restore funciona?)
[ ] Monitoramento de conexões ativas
[ ] Plano para crescimento de dados (archiving, partitioning)
```

### Cache

```
[ ] Cache strategy definida (Cache-Aside, Write-Through, etc.)
[ ] TTL definido para cada tipo de dado em cache
[ ] Invalidação de cache implementada (on write/update/delete)
[ ] Monitoramento de hit/miss rate
[ ] Cache key com namespace para facilitar invalidação em massa
[ ] Proteção contra cache stampede (lock ou singleflight)
[ ] Fallback se o cache ficar indisponível (degrada, não quebra)
```

### Frontend

```
[ ] Lighthouse score > 80 em todas as categorias
[ ] Bundle size principal < 200KB (gzipped)
[ ] Code splitting por rota implementado
[ ] Lazy loading de imagens e componentes pesados
[ ] Assets servidos via CDN
[ ] Compressão gzip/brotli habilitada
[ ] Service Worker para cache de assets (se aplicável)
[ ] Core Web Vitals dentro do "bom" (LCP < 2.5s, FID < 100ms, CLS < 0.1)
```

### Observabilidade

```
[ ] Logs estruturados em JSON com correlation ID
[ ] Métricas de latência por endpoint (p50, p95, p99)
[ ] Métricas de throughput (RPS)
[ ] Métricas de error rate
[ ] Dashboard com visão geral do sistema
[ ] Alertas para latência, erros, CPU, memória
[ ] Tracing distribuído (se microsserviços)
[ ] Runbook documentado para cada alerta
```

### Segurança na Escala

```
[ ] Rate limiting por IP e por usuário
[ ] DDoS protection (Cloudflare, AWS Shield)
[ ] API keys com limites de uso
[ ] Throttling progressivo (429 antes de 503)
[ ] Bulk operations com limites (max 100 items por request)
[ ] Timeouts em todas as chamadas externas
[ ] Secrets em vault (não em variáveis de ambiente em texto plano)
```

### Pontuação

| Categoria | Itens OK | Total | Status |
|---|---|---|---|
| Infraestrutura | ___ | 11 | 🔴 / 🟡 / 🟢 |
| Aplicação | ___ | 12 | 🔴 / 🟡 / 🟢 |
| Banco de Dados | ___ | 10 | 🔴 / 🟡 / 🟢 |
| Cache | ___ | 7 | 🔴 / 🟡 / 🟢 |
| Frontend | ___ | 8 | 🔴 / 🟡 / 🟢 |
| Observabilidade | ___ | 8 | 🔴 / 🟡 / 🟢 |
| Segurança na Escala | ___ | 7 | 🔴 / 🟡 / 🟢 |

**Legenda:**
- 🟢 Verde: > 80% dos itens marcados
- 🟡 Amarelo: 50-80% dos itens marcados
- 🔴 Vermelho: < 50% dos itens marcados — risco de indisponibilidade ao crescer

---

## Referência Rápida: Quando Usar o Quê

```
                      PROBLEMA
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Request lento   Banco lento    Muitos requests
          │              │              │
    ┌─────┴─────┐   ┌────┴────┐    ┌────┴────┐
    ▼           ▼   ▼         ▼    ▼         ▼
 CPU alto   I/O alto  Leitura  Escrita  App     Rede
    │           │     lenta    lenta    lenta
    ▼           ▼       │        │       │       │
 Scale     Cache/    Read     Sharding  Scale   CDN
 Horizontal  Filas  Replicas  /CQRS   Horizontal
    │                  │        │       │
    ▼                  ▼        ▼       ▼
  Auto-           Connection  Event   Load
  Scaling          Pooling   Sourcing Balancer
```

---

> **Última atualização:** Junho 2025
