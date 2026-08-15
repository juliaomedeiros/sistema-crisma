# Templates de Artefatos — Consultoria Técnica

> Referência com templates completos e prontos para copiar/adaptar.
> Cada template segue boas práticas de engenharia de software e pode ser
> usado diretamente como ponto de partida para qualquer projeto.

---

## Índice de Templates

| Template | Uso Principal | Quando Usar |
|----------|--------------|-------------|
| **Spec** | Especificação de requisitos | Início de projeto novo ou funcionalidade grande |
| **Plan** | Plano de implementação técnica | Após a Spec ser aprovada, antes de codificar |
| **Tasks** | Lista de tarefas detalhada | Após o Plan, para execução sprint a sprint |
| **ADR** | Registro de decisão arquitetural | Sempre que uma decisão técnica relevante for tomada |
| **Auditoria** | Diagnóstico de projeto existente | Ao assumir projeto legado ou revisar saúde técnica |

---

## Template: Spec (Especificação)

Objetivo: documentar **o que** o sistema deve fazer, sem entrar em **como** implementar.

````markdown
# Especificação: [Nome do Projeto/Funcionalidade]

**Versão:** 1.0
**Data:** YYYY-MM-DD
**Autor:** [Nome]
**Status:** Rascunho | Em Revisão | Aprovada

---

## 1. Visão Geral

### Contexto
[Descreva o contexto de negócio. Qual problema existe hoje? Por que este projeto é necessário?
Exemplo: "Atualmente o time de vendas registra pedidos manualmente em planilhas Excel,
causando erros de digitação em 15% dos pedidos e atrasos médios de 2 dias no faturamento."]

### Proposta
[Descrição concisa da solução proposta em 2-3 parágrafos.
Exemplo: "Sistema web para registro e acompanhamento de pedidos com integração
direta ao ERP, eliminando entrada manual de dados e reduzindo o ciclo de faturamento."]

---

## 2. Objetivos

### Objetivo Principal
- [Ex: Reduzir erros de entrada de pedidos de 15% para menos de 1%]

### Objetivos Secundários
- [Ex: Diminuir tempo médio de processamento de pedido de 2 dias para 4 horas]
- [Ex: Fornecer visibilidade em tempo real do status dos pedidos para o time comercial]
- [Ex: Gerar relatórios automáticos de vendas por período]

### Métricas de Sucesso
| Métrica | Valor Atual | Meta | Como Medir |
|---------|-------------|------|------------|
| Taxa de erro em pedidos | 15% | < 1% | Comparação pedido vs. fatura |
| Tempo de processamento | 48h | 4h | Timestamp criação → aprovação |
| Satisfação do usuário | N/A | > 4.0/5.0 | Pesquisa NPS trimestral |

---

## 3. Público-Alvo

### Persona 1: [Nome da Persona]
- **Perfil:** [Ex: Vendedor externo, 25-45 anos, usa smartphone no campo]
- **Necessidade principal:** [Ex: Registrar pedidos rapidamente durante visitas a clientes]
- **Dor atual:** [Ex: Precisa anotar em papel e depois digitar no escritório]
- **Frequência de uso:** [Ex: 10-20 vezes por dia]

### Persona 2: [Nome da Persona]
- **Perfil:** [Ex: Gerente comercial, precisa de visão consolidada]
- **Necessidade principal:** [Ex: Acompanhar pipeline de vendas e aprovar pedidos]
- **Dor atual:** [Ex: Informações espalhadas em múltiplas planilhas]
- **Frequência de uso:** [Ex: 3-5 vezes por dia]

---

## 4. Requisitos Funcionais

### RF01 — Cadastro de Pedidos
- **Descrição:** O sistema deve permitir que vendedores registrem pedidos com cliente,
  produtos, quantidades e condições comerciais.
- **Regras de negócio:**
  - Pedido deve ter no mínimo 1 item
  - Desconto máximo sem aprovação gerencial: 10%
  - Cliente deve estar ativo no cadastro
- **Critério de aceite:**
  - [ ] Vendedor consegue criar pedido em menos de 2 minutos
  - [ ] Sistema valida estoque disponível em tempo real
  - [ ] Pedido gera número único sequencial
- **Prioridade:** Alta
- **Complexidade estimada:** Média

### RF02 — [Nome do Requisito]
- **Descrição:** [O que o sistema deve fazer]
- **Regras de negócio:**
  - [Regra 1]
  - [Regra 2]
- **Critério de aceite:**
  - [ ] [Critério verificável 1]
  - [ ] [Critério verificável 2]
- **Prioridade:** Alta | Média | Baixa
- **Complexidade estimada:** Baixa | Média | Alta

> Repita para cada requisito funcional. Numere sequencialmente: RF03, RF04, etc.

---

## 5. Requisitos Não-Funcionais

### RNF01 — Performance
- Tempo de resposta para operações de leitura: < 200ms (p95)
- Tempo de resposta para operações de escrita: < 500ms (p95)
- Suportar no mínimo 100 usuários simultâneos na fase inicial
- Tempo de carregamento inicial da aplicação: < 3 segundos em conexão 3G

### RNF02 — Disponibilidade
- Uptime mínimo: 99.5% (permite ~3.6h de downtime por mês)
- Janela de manutenção: domingos, 02:00-06:00 (horário de Brasília)
- RTO (Recovery Time Objective): 1 hora
- RPO (Recovery Point Objective): 15 minutos

### RNF03 — Escalabilidade
- Crescimento projetado: 50% ao ano em volume de transações
- Sistema deve escalar horizontalmente sem redesign
- Banco de dados deve suportar até 10 milhões de registros sem degradação perceptível

### RNF04 — Acessibilidade
- Conformidade com WCAG 2.1 nível AA
- Suporte a leitores de tela (NVDA, JAWS)
- Navegação completa via teclado
- Contraste mínimo de 4.5:1 para textos

### RNF05 — Compatibilidade
- Navegadores: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: responsivo para telas ≥ 320px de largura
- Sistemas operacionais: Android 10+, iOS 14+

---

## 6. Requisitos de Segurança

### Autenticação
- Autenticação via OAuth 2.0 / OpenID Connect
- Suporte a MFA (Multi-Factor Authentication) para perfis administrativos
- Sessão expira após 30 minutos de inatividade
- Bloqueio de conta após 5 tentativas falhas de login

### Autorização
- Modelo RBAC (Role-Based Access Control) com perfis: Admin, Gerente, Vendedor, Visualizador
- Princípio do menor privilégio aplicado em todas as operações
- Logs de auditoria para todas as ações sensíveis

### Proteção de Dados
- Dados em trânsito: TLS 1.2+ obrigatório
- Dados em repouso: criptografia AES-256 para dados sensíveis
- PII (Personally Identifiable Information): mascaramento em logs
- Backup criptografado diário

### Compliance
- LGPD: consentimento explícito para coleta de dados pessoais
- Direito ao esquecimento: mecanismo de exclusão/anonimização de dados
- Retenção de dados: política definida por tipo de dado

---

## 7. Restrições e Premissas

### Restrições
- Orçamento máximo para infraestrutura: R$ X.XXX/mês
- Prazo de entrega do MVP: XX semanas
- Time disponível: X desenvolvedores + X QA
- Integração obrigatória com ERP [Nome] versão X.X

### Premissas
- API do ERP estará disponível e documentada até [data]
- Ambiente de homologação será provisionado pelo cliente
- Usuários terão acesso a dispositivos com internet
- Dados históricos serão migrados pelo time do cliente

---

## 8. Fora de Escopo

> Itens explicitamente **não incluídos** nesta versão:

- Módulo financeiro / faturamento (será integrado via ERP)
- Aplicativo mobile nativo (será PWA responsivo)
- Integração com marketplaces de terceiros
- Relatórios de BI avançados (apenas relatórios operacionais básicos)
- Gestão de estoque (apenas consulta de disponibilidade)

---

## 9. Critérios de Aceite Gerais

- [ ] Todos os requisitos funcionais de prioridade Alta implementados e testados
- [ ] Cobertura de testes automatizados ≥ 80% para regras de negócio
- [ ] Zero vulnerabilidades críticas ou altas no scan de segurança
- [ ] Documentação de API completa (OpenAPI/Swagger)
- [ ] Manual do usuário básico disponível
- [ ] Performance dentro dos limites definidos nos RNFs
- [ ] Aprovação do Product Owner em ambiente de homologação

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| Pedido | Solicitação formal de compra de produtos por um cliente |
| SKU | Stock Keeping Unit — código único de identificação do produto |
| ERP | Enterprise Resource Planning — sistema de gestão integrada |

---

## Histórico de Alterações

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | YYYY-MM-DD | [Nome] | Versão inicial |
````

---

## Template: Plan (Plano de Implementação)

Objetivo: documentar **como** o sistema será construído tecnicamente.

````markdown
# Plano de Implementação: [Nome do Projeto]

**Versão:** 1.0
**Data:** YYYY-MM-DD
**Autor:** [Nome]
**Spec de referência:** [Link ou nome do documento de Spec]
**Status:** Rascunho | Em Revisão | Aprovado

---

## 1. Stack Tecnológica

### Visão Geral da Stack

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| Frontend | Next.js + React | 14.x | SSR para SEO, App Router para performance, ecossistema maduro |
| Estilização | Tailwind CSS | 3.x | Utility-first, design system consistente, tree-shaking eficiente |
| Backend / API | Node.js + Fastify | 20 LTS / 4.x | Performance superior ao Express, schema validation nativa |
| ORM | Prisma | 5.x | Type-safety, migrations automáticas, boa DX |
| Banco de dados | PostgreSQL | 16.x | ACID, JSON support, extensões (pg_trgm, PostGIS se necessário) |
| Cache | Redis | 7.x | Cache de sessão e queries frequentes, pub/sub para real-time |
| Autenticação | NextAuth.js / Auth.js | 5.x | Integração nativa com Next.js, suporte a múltiplos providers |
| Testes | Vitest + Playwright | — | Vitest para unit/integration, Playwright para E2E |
| CI/CD | GitHub Actions | — | Integrado ao repositório, matrix builds, cache de deps |
| Infra | Docker + AWS (ECS Fargate) | — | Containerizado, serverless compute, auto-scaling |
| Monitoramento | Sentry + Grafana | — | Error tracking + métricas de infra e aplicação |
| CDN/Hosting | Vercel ou CloudFront | — | Edge network, deploy automático, preview por branch |

### Decisões de Stack Relevantes
- Justificativa detalhada para escolhas não óbvias (ver ADR-001, ADR-002)
- Trade-offs aceitos e suas implicações

---

## 2. Arquitetura Proposta

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                      CDN / Edge                         │
│                   (Vercel / CloudFront)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Pages/  │  │  Compo-  │  │  Server Components   │   │
│  │  Routes  │  │  nents   │  │  (RSC + Data Fetch)  │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / tRPC
┌──────────────────────▼──────────────────────────────────┐
│                  Backend (API Layer)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Routes  │  │  Services│  │  Middlewares          │   │
│  │  Control │  │  (Biz    │  │  (Auth, Validation,   │   │
│  │  lers    │  │  Logic)  │  │   Rate Limit, Logs)   │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└───────┬──────────────┬──────────────┬───────────────────┘
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
   │PostgreSQL│   │   Redis   │  │  S3 /   │
   │ (Dados) │   │  (Cache)  │  │  Files  │
   └─────────┘   └───────────┘  └─────────┘
```

### Componentes e Responsabilidades

| Componente | Responsabilidade | Comunicação |
|------------|-----------------|-------------|
| Frontend (Next.js) | Interface do usuário, SSR, roteamento | REST/tRPC → Backend |
| API Layer | Regras de negócio, validação, autenticação | SQL → DB, Redis |
| PostgreSQL | Persistência de dados, integridade referencial | Acessado via Prisma ORM |
| Redis | Cache de sessão, rate limiting, dados temporários | Acessado via ioredis |
| S3 / Storage | Arquivos, uploads, backups | SDK da AWS |
| Serviço externo (ERP) | Integração de dados financeiros | REST API, webhook |

### Estrutura de Diretórios (Monorepo)

```
projeto/
├── apps/
│   ├── web/                  # Frontend Next.js
│   │   ├── app/              # App Router (rotas e layouts)
│   │   ├── components/       # Componentes React
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilitários do frontend
│   │   └── public/           # Assets estáticos
│   └── api/                  # Backend Fastify (se separado)
│       ├── routes/           # Definição de rotas
│       ├── services/         # Lógica de negócio
│       ├── middleware/       # Auth, validation, logging
│       └── integrations/     # Clientes para serviços externos
├── packages/
│   ├── database/             # Schema Prisma, migrations, seeds
│   ├── shared/               # Tipos, constantes, utils compartilhados
│   └── config/               # ESLint, TypeScript, Tailwind configs
├── tests/
│   ├── e2e/                  # Testes end-to-end (Playwright)
│   └── integration/          # Testes de integração
├── docs/                     # Documentação do projeto
├── docker-compose.yml
├── turbo.json                # Configuração do Turborepo
└── package.json
```

---

## 3. Plano de Segurança

### 3.1 Ameaças Identificadas (Modelo STRIDE)

| Categoria | Ameaça | Componente Afetado | Severidade |
|-----------|--------|--------------------|------------|
| Spoofing | Roubo de sessão / token JWT | Autenticação | Crítica |
| Tampering | Manipulação de dados em trânsito | API | Alta |
| Repudiation | Ações sem rastro de auditoria | Todas as camadas | Média |
| Information Disclosure | Exposição de PII em logs/erros | Backend, Logs | Alta |
| Denial of Service | Flood de requisições na API | API Gateway | Alta |
| Elevation of Privilege | Acesso a recursos de outro perfil | Autorização | Crítica |

### 3.2 Contramedidas por Camada

**Frontend:**
- CSP (Content Security Policy) restritivo configurado via headers
- Sanitização de inputs com DOMPurify para campos rich-text
- Tokens armazenados em httpOnly cookies (não em localStorage)
- Proteção contra CSRF via SameSite cookies + token CSRF

**Backend / API:**
- Rate limiting: 100 req/min por IP, 1000 req/min por usuário autenticado
- Validação de schema em todas as rotas (Zod / JSON Schema)
- Queries parametrizadas via ORM (prevenção de SQL injection)
- Headers de segurança: HSTS, X-Content-Type-Options, X-Frame-Options
- Sanitização e validação de uploads (tipo, tamanho, conteúdo)

**Banco de Dados:**
- Conexões via SSL obrigatório
- Credenciais rotacionadas via AWS Secrets Manager
- Backup automático diário com retenção de 30 dias
- Princípio de menor privilégio nas roles do banco

**Infraestrutura:**
- VPC privada para banco e serviços internos
- Security Groups restritivos (apenas portas necessárias)
- WAF na frente do load balancer / CDN
- Logs centralizados com retenção de 90 dias

### 3.3 Checklist de Segurança para Implementação

- [ ] Autenticação MFA habilitada para admins
- [ ] HTTPS enforçado em todos os ambientes (inclusive dev)
- [ ] Secrets gerenciados via variáveis de ambiente / vault (nunca em código)
- [ ] Dependências auditadas (`npm audit`, Snyk ou Dependabot ativo)
- [ ] OWASP Top 10 verificado antes do deploy em produção
- [ ] Testes de segurança automatizados no CI (SAST com Semgrep ou similar)
- [ ] Política de senhas: mínimo 12 caracteres, verificação contra listas de senhas vazadas
- [ ] Logs de auditoria para login, alteração de permissão e acesso a dados sensíveis
- [ ] Resposta a incidentes documentada e testada

---

## 4. Estratégia de Testes

### Pirâmide de Testes

```
        ╱╲
       ╱ E2E ╲           ~10% — Fluxos críticos de negócio
      ╱────────╲
     ╱Integration╲       ~20% — Integração entre serviços e DB
    ╱──────────────╲
   ╱   Unit Tests   ╲    ~70% — Regras de negócio isoladas
  ╱──────────────────╲
```

### Detalhamento por Tipo

| Tipo | Camada | Ferramenta | Cobertura Alvo | O que Testar |
|------|--------|-----------|----------------|--------------|
| Unitário | Services / Utils | Vitest | ≥ 90% | Regras de negócio, validações, cálculos |
| Unitário | Componentes React | Vitest + Testing Library | ≥ 80% | Renderização, interações, estados |
| Integração | API + DB | Vitest + Testcontainers | ≥ 80% | Endpoints, queries, transações |
| E2E | Fluxos completos | Playwright | Fluxos críticos | Login, CRUD principal, checkout |
| Performance | API | k6 ou Artillery | N/A | Carga, stress, picos |
| Segurança | Aplicação | OWASP ZAP / Semgrep | N/A | OWASP Top 10, SAST |
| Acessibilidade | Frontend | axe-core + Lighthouse | Score ≥ 90 | WCAG 2.1 AA |

### Estratégia de Dados de Teste
- **Unitários:** Mocks e fixtures controlados
- **Integração:** Banco PostgreSQL em container (Testcontainers), seed controlado
- **E2E:** Ambiente de staging com dados anonimizados

### Automação no CI
```yaml
# Ordem de execução no pipeline
1. Lint + Type Check (< 1 min)
2. Testes unitários (< 3 min)
3. Testes de integração (< 5 min)
4. Build da aplicação (< 3 min)
5. Testes E2E (< 10 min)
6. Scan de segurança (< 5 min)
7. Deploy em staging (automático em develop)
8. Deploy em produção (manual, requer aprovação)
```

---

## 5. Plano de Escalabilidade

### 5.1 Fase Atual (MVP — até 500 usuários)
- 1 instância de aplicação (2 vCPU, 4GB RAM)
- 1 instância PostgreSQL (db.t3.medium ou equivalente)
- Redis single node para cache de sessão
- Custo estimado: R$ 500-800/mês

### 5.2 Gatilhos para Escalar

| Métrica | Limite | Ação |
|---------|--------|------|
| CPU da aplicação | > 70% sustentado por 5min | Adicionar instância (auto-scaling) |
| Latência p95 | > 500ms | Investigar queries, adicionar cache |
| Conexões ao DB | > 80% do pool | Aumentar pool ou adicionar read replica |
| Armazenamento do DB | > 75% do disco | Aumentar disco, avaliar particionamento |
| Usuários simultâneos | > 400 | Preparar Fase 2 |

### 5.3 Fase 2 (até 5.000 usuários)
- Auto-scaling: 2-6 instâncias de aplicação
- PostgreSQL com read replica para queries de relatório
- Redis Cluster para cache distribuído
- CDN para assets estáticos e caching de páginas públicas
- Custo estimado: R$ 2.000-4.000/mês

### 5.4 Fase 3 (até 50.000 usuários)
- Separação de serviços críticos (microserviços ou módulos independentes)
- Filas para processamento assíncrono (SQS / BullMQ)
- Banco de dados: sharding ou migração parcial para DynamoDB
- Elasticsearch para busca full-text
- Custo estimado: R$ 8.000-15.000/mês

---

## 6. Fases de Implementação

### Fase 1: MVP (Semanas 1-6)
**Objetivo:** Funcionalidades essenciais para validação com usuários reais.

**Entregas:**
- [ ] Setup do projeto (monorepo, CI/CD, ambientes)
- [ ] Autenticação e autorização (login, perfis básicos)
- [ ] CRUD principal (a funcionalidade core do sistema)
- [ ] Interface responsiva básica
- [ ] Deploy em staging para testes de aceitação

**Marco de validação:** 10 usuários piloto usando o sistema por 2 semanas.

### Fase 2: Consolidação (Semanas 7-10)
**Objetivo:** Polimento, integrações e cobertura de testes.

**Entregas:**
- [ ] Integração com ERP / sistema externo
- [ ] Relatórios operacionais básicos
- [ ] Notificações (email / in-app)
- [ ] Testes E2E dos fluxos críticos
- [ ] Scan de segurança e correção de vulnerabilidades

**Marco de validação:** Aprovação no checklist de segurança e performance.

### Fase 3: Produção (Semanas 11-12)
**Objetivo:** Go-live com monitoramento e suporte.

**Entregas:**
- [ ] Monitoramento e alertas configurados (Sentry, Grafana)
- [ ] Documentação de API (Swagger/OpenAPI)
- [ ] Runbook de operações (deploy, rollback, troubleshooting)
- [ ] Treinamento de usuários
- [ ] Deploy em produção

**Marco de validação:** 1 semana em produção sem incidentes críticos.

---

## 7. Dependências e Ordem de Execução

### Diagrama de Dependências

```
Setup do Projeto ─────┬──── Autenticação ────┬──── CRUD Principal
                      │                      │
                      └──── Design System ───┘
                                             │
                                    Integração ERP ──── Relatórios
                                             │
                                    Testes E2E ──── Deploy Produção
```

### Caminho Crítico
1. Setup do Projeto (bloqueante para tudo)
2. Autenticação (bloqueante para CRUD e integrações)
3. CRUD Principal (bloqueante para integração e relatórios)
4. Integração ERP (bloqueante para relatórios com dados reais)

---

## 8. Riscos e Mitigações

| # | Risco | Prob. | Impacto | Mitigação |
|---|-------|-------|---------|-----------|
| 1 | API do ERP indisponível ou mal documentada | Alta | Alto | Criar camada de abstração (adapter); mock da API para dev paralelo |
| 2 | Requisitos mudam durante a implementação | Média | Médio | Spec aprovada como baseline; mudanças via change request formal |
| 3 | Performance do banco com volume real | Média | Alto | Testes de carga na Fase 2; índices planejados desde o início |
| 4 | Desenvolvedor-chave sai do projeto | Baixa | Alto | Documentação contínua; code review obrigatório; pair programming |
| 5 | Vulnerabilidade de segurança em dependência | Média | Alto | Dependabot ativo; audit semanal; política de atualização |

---

## 9. Decisões Técnicas (ADRs)

### ADR-001: Uso de Next.js App Router ao invés de Pages Router
- **Contexto:** Precisamos de SSR para SEO e performance, e o App Router é o padrão
  recomendado pelo time do Next.js a partir da versão 13.
- **Decisão:** Usar App Router com React Server Components.
- **Justificativa:** Melhor performance (streaming SSR), layouts aninhados nativos,
  menor JavaScript enviado ao cliente via RSC.
- **Alternativas consideradas:**
  - Pages Router: mais maduro, mas em modo de manutenção
  - Remix: boa DX, mas ecossistema menor e menos integrações disponíveis
  - SPA puro (Vite + React): sem SSR, ruim para SEO

### ADR-002: PostgreSQL ao invés de MongoDB
- **Contexto:** Dados do sistema são majoritariamente relacionais (pedidos, clientes,
  produtos) com integridade referencial importante.
- **Decisão:** Usar PostgreSQL como banco principal.
- **Justificativa:** ACID compliance, suporte a JSON para dados semi-estruturados,
  melhor para queries complexas e relatórios.
- **Alternativas consideradas:**
  - MongoDB: flexível, mas integridade referencial fraca para este caso
  - MySQL: viável, mas PostgreSQL tem melhor suporte a JSON e extensões

> Adicione novos ADRs conforme decisões técnicas forem tomadas durante o projeto.

---

## Histórico de Alterações

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | YYYY-MM-DD | [Nome] | Versão inicial |
````

---

## Template: Tasks (Lista de Tarefas)

Objetivo: detalhar **cada tarefa** necessária para executar o plano, com critérios claros de conclusão.

````markdown
# Tarefas: [Nome do Projeto]

**Plan de referência:** [Link ou nome do documento de Plan]
**Atualizado em:** YYYY-MM-DD

---

## Resumo de Progresso

| Fase | Total | Concluídas | Em Andamento | Pendentes | % Concluído |
|------|-------|-----------|--------------|-----------|-------------|
| Fase 1: Setup | 5 | 0 | 0 | 5 | 0% |
| Fase 2: MVP | 8 | 0 | 0 | 8 | 0% |
| Fase 3: Integração | 4 | 0 | 0 | 4 | 0% |
| **Total** | **17** | **0** | **0** | **17** | **0%** |

---

## Legenda de Status

- ⬜ Pendente
- 🔄 Em andamento
- ✅ Concluída
- 🚫 Bloqueada
- ❌ Cancelada

---

## Fase 1: Setup e Fundação

### ⬜ Tarefa 1.1 — Inicialização do Monorepo
- **Descrição:** Configurar monorepo com Turborepo, definir estrutura de diretórios
  conforme o Plan, configurar TypeScript, ESLint e Prettier compartilhados.
- **Entregáveis:**
  - Repositório no GitHub com branch protection configurado
  - Estrutura `apps/web`, `apps/api`, `packages/*` criada
  - Scripts `dev`, `build`, `test`, `lint` funcionando
- **Critério de aceite:**
  - [ ] `turbo dev` inicia frontend e backend simultaneamente
  - [ ] `turbo build` compila sem erros
  - [ ] `turbo lint` roda sem warnings
- **Testes necessários:** Smoke test — build e dev funcionam em máquina limpa
- **Considerações de segurança:** `.env` no `.gitignore`; secrets placeholder documentados
- **Impacto na escalabilidade:** Monorepo facilita compartilhamento de código e deploys coordenados
- **Estimativa:** P (2-4 horas)
- **Dependências:** Nenhuma
- **Prioridade:** Alta
- **Responsável:** [Nome]

### ⬜ Tarefa 1.2 — Configuração do CI/CD
- **Descrição:** Criar pipeline no GitHub Actions com lint, testes, build e deploy
  automático para staging no branch `develop`.
- **Entregáveis:**
  - Workflow `.github/workflows/ci.yml` configurado
  - Deploy automático em staging funcionando
  - Cache de `node_modules` e build artifacts configurado
- **Critério de aceite:**
  - [ ] Push no `develop` dispara pipeline completo
  - [ ] Pipeline falha se lint ou testes falharem
  - [ ] Deploy em staging acontece apenas se pipeline passar
  - [ ] Pipeline completo executa em < 15 minutos
- **Testes necessários:** Verificar que pipeline falha corretamente com teste quebrado
- **Considerações de segurança:** Secrets do deploy via GitHub Secrets; OIDC para AWS se possível
- **Impacto na escalabilidade:** Pipeline preparado para matrix builds quando necessário
- **Estimativa:** M (4-8 horas)
- **Dependências:** Tarefa 1.1
- **Prioridade:** Alta
- **Responsável:** [Nome]

### ⬜ Tarefa 1.3 — Setup do Banco de Dados e ORM
- **Descrição:** Configurar PostgreSQL via Docker Compose para dev local, definir schema
  inicial do Prisma com modelos base (User, Role), criar migration inicial e seed.
- **Entregáveis:**
  - `docker-compose.yml` com PostgreSQL e Redis
  - Schema Prisma com modelos base
  - Seed script com dados de desenvolvimento
  - Script de reset do banco para dev (`prisma migrate reset`)
- **Critério de aceite:**
  - [ ] `docker compose up` sobe banco e Redis
  - [ ] `prisma migrate dev` aplica migrations sem erro
  - [ ] `prisma db seed` popula dados de teste
  - [ ] Tipos TypeScript gerados automaticamente pelo Prisma
- **Testes necessários:** Teste de integração conectando ao banco e executando CRUD básico
- **Considerações de segurança:** Credenciais de dev diferentes de prod; SSL configurável
- **Impacto na escalabilidade:** Schema pensado para indexação desde o início
- **Estimativa:** M (4-8 horas)
- **Dependências:** Tarefa 1.1
- **Prioridade:** Alta
- **Responsável:** [Nome]

### ⬜ Tarefa 1.4 — Design System Base
- **Descrição:** Configurar Tailwind CSS, definir tokens de design (cores, tipografia,
  espaçamento), criar componentes base reutilizáveis (Button, Input, Card, Modal, Table).
- **Entregáveis:**
  - Tailwind config com tema customizado
  - 8-10 componentes base com variantes
  - Storybook configurado para documentação visual (opcional)
- **Critério de aceite:**
  - [ ] Componentes seguem padrão de props consistente
  - [ ] Componentes são acessíveis (roles ARIA, navegação por teclado)
  - [ ] Responsivos em breakpoints: mobile (320px), tablet (768px), desktop (1024px+)
- **Testes necessários:** Testes de renderização com Testing Library; verificação com axe-core
- **Considerações de segurança:** Sanitização em componentes de input
- **Impacto na escalabilidade:** Design system evita retrabalho em novas funcionalidades
- **Estimativa:** G (8-16 horas)
- **Dependências:** Tarefa 1.1
- **Prioridade:** Alta
- **Responsável:** [Nome]

### ⬜ Tarefa 1.5 — Autenticação e Autorização
- **Descrição:** Implementar autenticação com NextAuth.js (Auth.js), configurar
  providers (credenciais + Google/Microsoft), implementar RBAC com middleware de
  autorização em todas as rotas protegidas.
- **Entregáveis:**
  - Login/logout/registro funcionando
  - Middleware de autenticação no Next.js
  - Middleware de autorização por role na API
  - Páginas: login, registro, esqueci senha, perfil
- **Critério de aceite:**
  - [ ] Usuário consegue se registrar, fazer login e logout
  - [ ] Sessão expira após 30 minutos de inatividade
  - [ ] Rotas protegidas redirecionam para login se não autenticado
  - [ ] Usuário sem permissão recebe 403 ao acessar rota restrita
  - [ ] Tokens armazenados em httpOnly cookies
- **Testes necessários:**
  - Unitário: lógica de autorização (role checking)
  - Integração: fluxo completo de login/registro via API
  - E2E: fluxo de login na interface
- **Considerações de segurança:** Rate limiting no login (5 tentativas/min); bcrypt para hash de senhas; proteção CSRF
- **Impacto na escalabilidade:** Sessões em Redis para suportar múltiplas instâncias
- **Estimativa:** G (16-24 horas)
- **Dependências:** Tarefa 1.3, Tarefa 1.4
- **Prioridade:** Alta
- **Responsável:** [Nome]

---

## Fase 2: MVP — Funcionalidades Core

### ⬜ Tarefa 2.1 — [Nome da funcionalidade core]
- **Descrição:** [O que implementar]
- **Entregáveis:**
  - [Entregável 1]
  - [Entregável 2]
- **Critério de aceite:**
  - [ ] [Critério verificável]
- **Testes necessários:** [Tipos de teste e o que testar]
- **Considerações de segurança:** [Validações, autorizações específicas]
- **Impacto na escalabilidade:** [Índices, cache, paginação]
- **Estimativa:** P/M/G
- **Dependências:** Tarefa 1.5
- **Prioridade:** Alta | Média | Baixa
- **Responsável:** [Nome]

> Repita para cada tarefa da fase. Numere sequencialmente: 2.2, 2.3, etc.

---

## Fase 3: Integração e Polimento

### ⬜ Tarefa 3.1 — [Nome]
> Mesmo formato das tarefas anteriores.

---

## Notas e Decisões em Andamento

- [YYYY-MM-DD] [Nota ou decisão tomada durante a execução]
- [YYYY-MM-DD] [Mudança de escopo ou prioridade, com justificativa]
````

---

## Template: ADR (Architecture Decision Record)

Objetivo: registrar **por que** uma decisão técnica foi tomada, para referência futura.

````markdown
# ADR-[NNN]: [Título da Decisão]

**Data:** YYYY-MM-DD
**Status:** Proposta | Aceita | Rejeitada | Substituída por ADR-XXX | Depreciada

---

## Contexto

[Qual problema estamos enfrentando? Qual é a situação atual que motivou esta decisão?
Seja específico sobre as circunstâncias, requisitos e restrições.]

Exemplo:
> O sistema precisa processar uploads de arquivos de até 50MB enviados por usuários.
> Atualmente não temos nenhuma infraestrutura de armazenamento de arquivos.
> Precisamos de uma solução que seja econômica para até 100GB de armazenamento inicial,
> com possibilidade de crescer para 1TB+ sem mudança de arquitetura.

---

## Decisão

[O que decidimos fazer? Seja claro e direto.]

Exemplo:
> Vamos usar AWS S3 para armazenamento de arquivos, com upload direto do frontend
> via presigned URLs geradas pelo backend. Os metadados dos arquivos serão armazenados
> no PostgreSQL, enquanto os arquivos binários ficam no S3.

---

## Justificativa

[Por que esta é a melhor decisão dado o contexto? Quais critérios foram usados?]

Exemplo:
> - **Custo:** S3 custa ~$0.023/GB/mês, muito abaixo de armazenar no servidor
> - **Escalabilidade:** Sem limite prático de armazenamento
> - **Performance:** Upload direto via presigned URL não passa pelo backend,
>   evitando gargalo de CPU e memória
> - **Durabilidade:** 99.999999999% (11 noves) de durabilidade
> - **Integração:** SDK oficial para Node.js, bem documentado
> - **Time já tem experiência:** 2 dos 3 devs já usaram S3 em projetos anteriores

---

## Alternativas Consideradas

### Alternativa 1: Armazenamento local no servidor (EBS/disco)
- **Prós:**
  - Implementação mais simples inicialmente
  - Sem dependência de serviço externo
- **Contras:**
  - Não escala horizontalmente (arquivo fica em 1 servidor)
  - Backup manual necessário
  - Custo por GB muito mais alto
  - Perda de dados se o servidor falhar
- **Motivo da rejeição:** Não atende requisito de escalabilidade e durabilidade

### Alternativa 2: MinIO (S3-compatible self-hosted)
- **Prós:**
  - API compatível com S3 (migração futura fácil)
  - Self-hosted, sem vendor lock-in
  - Open source
- **Contras:**
  - Responsabilidade operacional (manutenção, backup, monitoramento)
  - Custo de infra + tempo de operação supera o custo do S3 gerenciado
- **Motivo da rejeição:** Overhead operacional não justificado para o tamanho do time

### Alternativa 3: Cloudflare R2
- **Prós:**
  - Sem custo de egress (download)
  - API compatível com S3
  - Custo de armazenamento similar ao S3
- **Contras:**
  - Serviço mais novo, comunidade menor
  - Menos integrações nativas com outros serviços AWS que já usamos
- **Motivo da rejeição:** Viável, mas a equipe já está no ecossistema AWS

---

## Consequências

### Positivas
- Arquivos servidos globalmente via CloudFront (CDN) com latência baixa
- Backend fica leve — não processa upload/download de arquivos
- Custo previsível e escalável

### Negativas
- Dependência do ecossistema AWS (vendor lock-in parcial)
- Necessidade de gerenciar políticas de bucket, lifecycle rules e CORS
- Presigned URLs têm expiração — precisa de lógica para renovar se necessário

### Riscos
- Se a AWS S3 tiver outage, uploads ficam indisponíveis (mitigação: retry automático com UX de feedback)

---

## Referências

- [Documentação AWS S3](https://docs.aws.amazon.com/s3/)
- [Padrão de presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [ADR-001: Escolha da AWS como cloud provider](#)
````

---

## Template: Auditoria de Projeto Existente

Objetivo: diagnosticar a **saúde técnica** de um projeto existente e propor melhorias priorizadas.

````markdown
# Auditoria Técnica: [Nome do Projeto]

**Data da auditoria:** YYYY-MM-DD
**Auditor:** [Nome]
**Versão analisada:** [branch/tag/commit]
**Repositório:** [URL]

---

## 1. Visão Geral do Estado Atual

### Stack Atual
| Camada | Tecnologia | Versão | Status |
|--------|-----------|--------|--------|
| Frontend | React | 17.0.2 | ⚠️ Desatualizado (atual: 19.x) |
| Backend | Express | 4.18 | ✅ Suportado |
| Banco de dados | MongoDB | 5.0 | ⚠️ 1 major atrás (atual: 7.x) |
| Node.js | Node.js | 16.x | ❌ EOL desde setembro/2023 |
| Testes | Jest | 27 | ⚠️ Desatualizado |

### Métricas do Projeto
| Métrica | Valor | Avaliação |
|---------|-------|-----------|
| Linhas de código (sem testes) | ~45.000 | Projeto de médio porte |
| Arquivos fonte | 320 | — |
| Dependências diretas | 87 | ⚠️ Elevado — revisar necessidade |
| Dependências com vulnerabilidades | 12 | ❌ Crítico |
| Cobertura de testes | 23% | ❌ Muito baixa |
| Tempo médio de build | 4min 30s | ⚠️ Pode melhorar |
| Último deploy | há 3 meses | ⚠️ Infrequente |

### Complexidade
| Indicador | Valor | Avaliação |
|-----------|-------|-----------|
| Arquivos com > 500 linhas | 14 | ⚠️ Candidatos a refatoração |
| Funções com complexidade ciclomática > 15 | 8 | ❌ Difíceis de manter e testar |
| Dependências circulares | 3 | ⚠️ Risco de bugs |
| TODO/FIXME/HACK no código | 47 | ⚠️ Débito técnico visível |

---

## 2. Segurança

### 2.1 Vulnerabilidades Encontradas

| # | Severidade | Descrição | Localização | Correção Sugerida |
|---|-----------|-----------|-------------|-------------------|
| 1 | 🔴 Crítica | SQL Injection via input não sanitizado | `api/users.js:45` | Usar queries parametrizadas |
| 2 | 🔴 Crítica | Secrets hardcoded no código | `config/db.js:12` | Migrar para variáveis de ambiente |
| 3 | 🟠 Alta | Dependência com CVE conhecida | `lodash@4.17.15` | Atualizar para ≥4.17.21 |
| 4 | 🟠 Alta | CORS configurado com `*` (wildcard) | `server.js:8` | Restringir a domínios específicos |
| 5 | 🟡 Média | Headers de segurança ausentes | Servidor web | Adicionar Helmet.js |
| 6 | 🟡 Média | Rate limiting não implementado | API | Adicionar express-rate-limit |

### 2.2 Gaps no Checklist de Segurança

- [ ] ❌ Autenticação: tokens em localStorage (deveria ser httpOnly cookie)
- [ ] ❌ Autorização: sem verificação de ownership em rotas de update/delete
- [ ] ❌ HTTPS: não enforçado (HTTP aceito em produção)
- [ ] ❌ Logs: sem auditoria de ações sensíveis
- [ ] ⚠️ Senhas: bcrypt usado, mas sem política de complexidade
- [ ] ✅ CSRF: proteção implementada via token
- [ ] ✅ XSS: React escapa output por padrão

### 2.3 Prioridade de Correção de Segurança

```
URGENTE (fazer agora):
├── Remover secrets do código (#2)
├── Corrigir SQL injection (#1)
└── Atualizar dependências vulneráveis (#3)

PRÓXIMO SPRINT:
├── Restringir CORS (#4)
├── Adicionar headers de segurança (#5)
├── Migrar tokens para httpOnly cookies
└── Implementar rate limiting (#6)

BACKLOG:
├── Adicionar logs de auditoria
├── Implementar política de senhas
└── Verificação de ownership nas rotas
```

---

## 3. Performance e Escalabilidade

### 3.1 Gargalos Identificados

| # | Tipo | Descrição | Impacto | Evidência |
|---|------|-----------|---------|-----------|
| 1 | Banco de dados | Queries N+1 na listagem de pedidos | Latência 3-5s para listar 100 pedidos | Profiling com MongoDB Compass |
| 2 | Frontend | Bundle de 2.8MB sem code splitting | First Load de 8s em 3G | Lighthouse report |
| 3 | API | Sem cache em endpoints de leitura frequente | Cada request vai ao banco | Monitoramento de queries |
| 4 | Imagens | Imagens não otimizadas (PNG de 5MB+) | Página de produtos pesa 15MB | DevTools Network tab |

### 3.2 Pontos de Falha (SPOF)

| Componente | Risco | Mitigação Atual | Mitigação Recomendada |
|------------|-------|-----------------|----------------------|
| Servidor de aplicação | Single instance — se cair, tudo cai | Nenhuma | Load balancer + 2+ instâncias |
| Banco de dados | Sem réplica, sem backup automatizado | Backup manual semanal | Réplica + backup diário automatizado |
| DNS | Usando IP direto em configurações | Nenhuma | Migrar para DNS com failover |

### 3.3 Capacidade Estimada Atual

| Recurso | Capacidade Estimada | Uso Atual | Margem |
|---------|--------------------|-----------| -------|
| Requisições/segundo | ~50 req/s (estimado) | ~10 req/s | 5x |
| Conexões simultâneas ao DB | 20 (pool padrão) | ~8 | 2.5x |
| Armazenamento em disco | 50GB | 32GB | ⚠️ 64% usado |
| Memória do servidor | 4GB | 2.8GB | ⚠️ 70% usado |

---

## 4. Testes

### 4.1 Cobertura Atual

| Camada | Arquivos com Teste | Total de Arquivos | Cobertura | Avaliação |
|--------|-------------------|-------------------|-----------|-----------|
| Models / Entities | 8 | 15 | 53% | ⚠️ Parcial |
| Services / Use Cases | 3 | 22 | 14% | ❌ Insuficiente |
| Controllers / Routes | 0 | 18 | 0% | ❌ Sem testes |
| Componentes React | 5 | 85 | 6% | ❌ Praticamente inexistente |
| Utilitários | 4 | 10 | 40% | ⚠️ Parcial |

### 4.2 Tipos de Teste Existentes

- [x] Unitários (Jest) — existem, mas poucos e alguns desatualizados
- [ ] Integração — inexistentes
- [ ] E2E — inexistentes
- [ ] Performance / carga — nunca executados
- [ ] Segurança (SAST/DAST) — nunca executados

### 4.3 Problemas nos Testes Existentes

- 7 testes falhando no `main` (ignorados no CI com `--passWithNoErrors`)
- Mocks desatualizados que não refletem a API atual
- Sem setup/teardown de banco — testes dependem de dados existentes
- Sem testes no CI — pipeline faz apenas build

### 4.4 Gaps Críticos (O que Testar Primeiro)

1. **Regras de negócio de cálculo** (ex: preços, descontos, impostos) — risco alto de bug
2. **Fluxo de autenticação** — impacto direto em segurança
3. **Endpoints de escrita** (POST/PUT/DELETE) — risco de corrupção de dados
4. **Validação de inputs** — primeira linha de defesa contra dados inválidos

---

## 5. Código e Arquitetura

### 5.1 Débitos Técnicos

| # | Tipo | Descrição | Severidade | Esforço Estimado |
|---|------|-----------|------------|------------------|
| 1 | Arquitetura | Lógica de negócio misturada nos controllers | Alta | G (refatoração gradual) |
| 2 | Código | 14 arquivos com 500+ linhas — God Objects | Média | M por arquivo |
| 3 | Dependências | 87 deps diretas, muitas sem uso aparente | Média | P (usar depcheck) |
| 4 | Tipagem | JavaScript puro sem TypeScript | Alta | G (migração gradual) |
| 5 | Configuração | Variáveis de ambiente sem validação | Média | P (usar Zod/envalid) |
| 6 | Erro handling | try/catch genéricos sem logging adequado | Alta | M |
| 7 | Documentação | Nenhum README, nenhum comentário de API | Média | M |

### 5.2 Padrões Inconsistentes

| Aspecto | O que Existe | Problema |
|---------|-------------|----------|
| Nomenclatura | Mix de camelCase, snake_case e PascalCase | Dificulta leitura e busca |
| Imports | Alguns usam `require()`, outros `import` | Módulos misturados (CJS + ESM) |
| Tratamento de erros | Alguns locais: try/catch; outros: callback; outros: nada | Erros silenciosos em produção |
| Respostas da API | Estruturas diferentes por endpoint | Frontend precisa de adaptadores diferentes |
| Arquitetura | Alguns endpoints seguem MVC, outros são funções diretas | Difícil de manter e testar |

### 5.3 Pontos Positivos (Manter)

> Nem tudo é problema. Reconhecer o que funciona bem:

- ✅ Modelo de dados do MongoDB bem estruturado com validação via Mongoose
- ✅ Autenticação JWT implementada corretamente (expiração, refresh token)
- ✅ ESLint configurado (embora não rodando no CI)
- ✅ Docker Compose para ambiente de desenvolvimento local
- ✅ Separação clara entre frontend e backend (repositórios separados)
- ✅ Git flow usado corretamente com PRs e code review

---

## 6. Plano de Ação Priorizado

### 🟢 Quick Wins (1-2 semanas, risco baixo, resultado imediato)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Remover secrets do código e migrar para `.env` | Segurança 🔒 | 2h |
| 2 | Atualizar dependências com vulnerabilidades conhecidas | Segurança 🔒 | 4h |
| 3 | Adicionar Helmet.js para headers de segurança | Segurança 🔒 | 1h |
| 4 | Configurar ESLint e Prettier no CI (bloquear merge) | Qualidade 📊 | 2h |
| 5 | Remover dependências não utilizadas (`depcheck`) | Manutenção 🔧 | 2h |
| 6 | Corrigir CORS para domínios específicos | Segurança 🔒 | 1h |
| 7 | Adicionar rate limiting na API | Segurança 🔒 | 2h |
| 8 | Otimizar imagens (converter para WebP, lazy loading) | Performance ⚡ | 4h |

### 🟡 Médio Prazo (1-2 meses)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Migrar Node.js para versão LTS atual (20.x ou 22.x) | Segurança + Performance | 1-2 dias |
| 2 | Implementar code splitting no frontend | Performance ⚡ | 2-3 dias |
| 3 | Adicionar cache Redis nos endpoints de leitura mais acessados | Performance ⚡ | 3-5 dias |
| 4 | Resolver queries N+1 (agregações/populate otimizado) | Performance ⚡ | 3-5 dias |
| 5 | Separar lógica de negócio dos controllers (camada service) | Arquitetura 🏗️ | 2-3 semanas |
| 6 | Adicionar testes unitários para regras de negócio críticas | Qualidade 📊 | 1-2 semanas |
| 7 | Configurar monitoramento (Sentry + métricas básicas) | Operações 📈 | 2-3 dias |
| 8 | Padronizar respostas da API (formato consistente) | DX / Manutenção 🔧 | 1 semana |

### 🔴 Longo Prazo (3-6 meses)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Migração gradual para TypeScript | Qualidade + Manutenção 📊 | Contínuo |
| 2 | Implementar testes de integração e E2E | Qualidade 📊 | 3-4 semanas |
| 3 | Adicionar réplica do banco + backup automatizado | Resiliência 🛡️ | 1 semana |
| 4 | Implementar CI/CD completo com testes e deploy automático | Velocidade 🚀 | 1-2 semanas |
| 5 | Avaliar migração de React 17 para versão atual | Performance + Segurança | 2-3 semanas |
| 6 | Redesign da autenticação (httpOnly cookies + refresh token rotation) | Segurança 🔒 | 1-2 semanas |
| 7 | Documentação de API com Swagger/OpenAPI | DX / Onboarding 📚 | 1 semana |

---

## 7. Recomendação Final

### Classificação Geral do Projeto

| Aspecto | Nota (1-5) | Justificativa |
|---------|-----------|---------------|
| Segurança | ⭐⭐ (2/5) | Vulnerabilidades críticas, secrets expostos, headers ausentes |
| Performance | ⭐⭐⭐ (3/5) | Funcional, mas com gargalos identificáveis |
| Qualidade de código | ⭐⭐ (2/5) | Sem tipagem, padrões inconsistentes, God Objects |
| Testes | ⭐ (1/5) | Cobertura de 23%, sem integração ou E2E |
| Operações/DevOps | ⭐⭐ (2/5) | Docker existe, mas sem CI/CD, monitoramento ou alertas |
| Documentação | ⭐ (1/5) | Praticamente inexistente |

### Resumo Executivo

[2-3 parágrafos resumindo a situação geral, riscos mais urgentes e recomendação
de próximos passos. Exemplo:]

> O projeto está funcional e atende às necessidades básicas dos usuários atuais,
> mas apresenta riscos significativos de segurança e manutenibilidade. As vulnerabilidades
> críticas (secrets expostos e SQL injection) devem ser corrigidas imediatamente,
> pois representam risco real de exploração.
>
> A baixa cobertura de testes combinada com a ausência de tipagem torna mudanças
> arriscadas — cada alteração pode introduzir regressões silenciosas. Recomendo
> priorizar os Quick Wins de segurança na próxima semana e estabelecer uma
> cultura de testes gradual, começando pelas regras de negócio mais críticas.
>
> Para o médio prazo, a migração para TypeScript e a separação de responsabilidades
> nos controllers são os investimentos com maior retorno em manutenibilidade.
````

---

## Dicas de Uso dos Templates

| Situação | Template(s) a Usar | Ordem |
|----------|-------------------|-------|
| Projeto novo do zero | Spec → Plan → Tasks | Sequencial |
| Decisão técnica pontual | ADR | Isolado |
| Assumindo projeto existente | Auditoria → Plan de melhorias → Tasks | Sequencial |
| Funcionalidade grande em projeto existente | Spec (escopo menor) → Tasks | Sequencial |
| Code review arquitetural | Auditoria (seções relevantes) | Parcial |

### Boas Práticas

1. **Spec e Plan são documentos vivos** — atualize conforme o projeto evolui
2. **ADRs são imutáveis** — não edite ADRs aceitas; crie novas que substituam
3. **Tasks devem ser granulares** — uma tarefa ≤ 1 dia de trabalho é ideal
4. **Auditoria deve ter evidências** — links para código, screenshots, métricas reais
5. **Use o glossário** — termos de negócio devem ser definidos uma vez na Spec
