# Boas Práticas — Infraestrutura

> Guia de referência para consultoria técnica em infraestrutura de software.  
> Cobre desde Infraestrutura como Código até Disaster Recovery, com ferramentas, comandos e configurações reais.

---

## Infraestrutura como Código (IaC)

### Comparativo de Ferramentas

| Ferramenta       | Linguagem          | Cloud           | State          | Curva de Aprendizado |
|------------------|--------------------|-----------------|-----------------|-----------------------|
| **Terraform**    | HCL                | Multi-cloud     | Remote/Local    | Média                 |
| **Pulumi**       | TypeScript, Python, Go, C# | Multi-cloud | Backend próprio | Média (se já programa) |
| **AWS CDK**      | TypeScript, Python, Java, C# | AWS        | CloudFormation  | Média                 |
| **CloudFormation** | YAML/JSON        | AWS             | Gerenciado AWS  | Alta (verboso)        |
| **Ansible**      | YAML               | Multi-cloud     | Sem state       | Baixa                 |
| **OpenTofu**     | HCL                | Multi-cloud     | Remote/Local    | Média (fork do Terraform) |

### Versionamento de Infraestrutura

**Regras fundamentais:**

1. **Todo recurso de infra vive no Git** — nenhum recurso é criado manualmente no console
2. **Pull Requests obrigatórios** — toda mudança de infra passa por code review
3. **Commits atômicos** — cada commit representa uma mudança lógica completa
4. **Tags para releases** — versionar a infra com semver (`infra-v1.2.0`)

```
repo-infra/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── modules/
│   ├── networking/
│   ├── compute/
│   ├── database/
│   └── monitoring/
├── policies/
│   └── sentinel/           # ou OPA (Open Policy Agent)
└── scripts/
    ├── bootstrap.sh
    └── destroy-guard.sh
```

### State Management

| Aspecto              | Recomendação                                          |
|----------------------|-------------------------------------------------------|
| **Backend remoto**   | S3 + DynamoDB (AWS), GCS (GCP), Azure Blob Storage    |
| **Locking**          | Sempre habilitar lock para evitar alterações simultâneas |
| **Encriptação**      | State encriptado em repouso (SSE-S3, KMS)             |
| **Acesso**           | Restringir via IAM — apenas CI/CD e admins acessam    |
| **Backup**           | Versionamento habilitado no bucket de state           |
| **Isolamento**       | Um state file por ambiente (dev, staging, prod)       |

```hcl
# Exemplo: backend remoto Terraform (AWS)
terraform {
  backend "s3" {
    bucket         = "minha-empresa-terraform-state"
    key            = "prod/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abcd-1234"
  }
}
```

### Módulos Reutilizáveis

```hcl
# modules/rds/main.tf — módulo reutilizável para banco de dados
variable "environment" {
  type        = string
  description = "Nome do ambiente (dev, staging, prod)"
}

variable "instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "engine_version" {
  type    = string
  default = "15.4"
}

variable "allocated_storage" {
  type    = number
  default = 50
}

resource "aws_db_instance" "this" {
  identifier              = "app-${var.environment}"
  engine                  = "postgres"
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  storage_encrypted       = true
  backup_retention_period = var.environment == "prod" ? 30 : 7
  multi_az                = var.environment == "prod" ? true : false
  deletion_protection     = var.environment == "prod" ? true : false

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Uso do módulo:
# module "database_prod" {
#   source          = "../../modules/rds"
#   environment     = "prod"
#   instance_class  = "db.r6g.xlarge"
#   allocated_storage = 200
# }
```

### Drift Detection

| Ferramenta   | Comando / Método                                  |
|--------------|---------------------------------------------------|
| Terraform    | `terraform plan -detailed-exitcode` (exit 2 = drift) |
| AWS Config   | Regras de conformidade com verificação contínua   |
| Driftctl     | `driftctl scan --from tfstate://path/to/state`    |
| Pulumi       | `pulumi preview --expect-no-changes`              |
| CloudFormation | Drift detection no console ou `detect-stack-drift` |

**Automação de drift detection no CI:**

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection
on:
  schedule:
    - cron: '0 8 * * *'  # diariamente às 8h
jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
        working-directory: environments/prod
      - run: |
          terraform plan -detailed-exitcode -out=plan.out
          EXIT_CODE=$?
          if [ $EXIT_CODE -eq 2 ]; then
            echo "⚠️ DRIFT DETECTADO em produção!"
            # Enviar alerta para Slack/Teams
          fi
        working-directory: environments/prod
```

---

## CI/CD

### Pipeline Design — Fluxo Completo

```mermaid
flowchart LR
    A["Commit / PR"] --> B["Build"]
    B --> C["Testes Unitários"]
    C --> D["Análise Estática<br/>(SAST + Lint)"]
    D --> E["Scan de Dependências"]
    E --> F["Build de Imagem"]
    F --> G["Scan de Container"]
    G --> H["Deploy Staging"]
    H --> I["Testes de Integração"]
    I --> J["Testes E2E"]
    J --> K["Gate de Aprovação"]
    K --> L["Deploy Prod"]
    L --> M["Smoke Tests"]
    M --> N["Monitoramento<br/>Pós-Deploy"]
```

### Gates de Qualidade

| Gate                    | Ferramenta                            | Critério de Bloqueio                  |
|-------------------------|---------------------------------------|---------------------------------------|
| **Testes unitários**    | Jest, pytest, JUnit, Go test          | Qualquer falha bloqueia               |
| **Cobertura**           | Codecov, Coveralls, SonarQube         | < 80% de cobertura bloqueia           |
| **SAST**                | SonarQube, Semgrep, CodeQL            | Vulnerabilidade crítica/alta bloqueia |
| **Dependency Scan**     | Snyk, Dependabot, OWASP Dep-Check    | CVE crítica/alta conhecida bloqueia   |
| **Container Scan**      | Trivy, Snyk Container, Grype         | Vulnerabilidade crítica bloqueia      |
| **Secrets Scan**        | Gitleaks, TruffleHog, detect-secrets | Qualquer secret exposto bloqueia      |
| **Lint / Formatação**   | ESLint, Prettier, Ruff, golangci-lint| Erros de lint bloqueiam               |
| **License Compliance**  | FOSSA, license_finder                 | Licença incompatível bloqueia         |
| **IaC Scan**            | Checkov, tfsec, KICS                  | Misconfiguration crítica bloqueia     |

### Estratégias de Deploy

| Estratégia       | Como Funciona                                      | Risco     | Rollback    | Ideal Para                      |
|------------------|----------------------------------------------------|-----------|-------------|---------------------------------|
| **Blue-Green**   | Dois ambientes idênticos; switch no load balancer   | Baixo     | Instantâneo | Aplicações stateless            |
| **Canary**       | Nova versão para % pequeno de tráfego               | Baixo     | Rápido      | Validação gradual em produção   |
| **Rolling**      | Atualiza instâncias uma a uma                       | Médio     | Médio       | Kubernetes, Auto Scaling Groups |
| **Recreate**     | Derruba tudo, sobe versão nova                      | Alto      | Lento       | Ambientes de dev/staging        |
| **A/B Testing**  | Versões diferentes para segmentos de usuários       | Baixo     | Rápido      | Testes de funcionalidade/UX     |
| **Shadow/Dark**  | Tráfego duplicado para nova versão (sem resposta)   | Muito baixo | N/A       | Validação de performance        |

**Exemplo Blue-Green com AWS ALB + Terraform:**

```hcl
resource "aws_lb_listener_rule" "blue_green" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = var.active_color == "blue" ? aws_lb_target_group.blue.arn : aws_lb_target_group.green.arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

**Exemplo Canary com Kubernetes (Argo Rollouts):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: minha-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5        # 5% do tráfego
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 25       # 25% do tráfego
        - pause: { duration: 10m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50       # 50% do tráfego
        - pause: { duration: 15m }
        - setWeight: 100      # 100% do tráfego
      canaryMetadata:
        labels:
          version: canary
      stableMetadata:
        labels:
          version: stable
```

### Rollback Automatizado

```yaml
# Rollback automático baseado em métricas (Argo Rollouts)
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] >= 0.95   # taxa de sucesso >= 95%
      failureLimit: 3                        # falha 3x = rollback
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status=~"2.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
```

**Rollback manual — comandos essenciais:**

```bash
# Kubernetes
kubectl rollout undo deployment/minha-api
kubectl rollout undo deployment/minha-api --to-revision=3

# Helm
helm rollback minha-release 2    # volta para revisão 2
helm history minha-release       # ver histórico

# Terraform
git revert <commit-hash>        # reverter commit de infra
terraform apply                  # aplicar estado anterior

# AWS ECS
aws ecs update-service --cluster prod --service api \
  --task-definition api:42      # volta para task definition 42
```

### Feature Flags

| Ferramenta        | Tipo         | Preço           | Ideal Para                     |
|-------------------|--------------|-----------------|--------------------------------|
| **LaunchDarkly**  | SaaS         | Pago            | Empresas grandes, SDK robusto  |
| **Unleash**       | Open-source  | Gratuito/Pago   | Self-hosted, controle total    |
| **Flagsmith**     | Open-source  | Gratuito/Pago   | Open-source com UI amigável    |
| **ConfigCat**     | SaaS         | Freemium        | Times pequenos                 |
| **Env vars**      | DIY          | Gratuito        | Casos simples, sem UI          |
| **AWS AppConfig** | Gerenciado   | Pay-per-use     | Ecossistema AWS                |

```python
# Exemplo com Unleash (Python)
from UnleashClient import UnleashClient

client = UnleashClient(
    url="https://unleash.minha-empresa.com/api",
    app_name="minha-api",
    custom_headers={"Authorization": os.getenv("UNLEASH_TOKEN")}
)
client.initialize_client()

if client.is_enabled("novo-checkout"):
    return novo_checkout(request)
else:
    return checkout_legado(request)
```

### Comparativo de Plataformas CI/CD

| Plataforma          | Hospedagem     | Config        | Runners                  | Pontos Fortes                  |
|---------------------|----------------|---------------|--------------------------|--------------------------------|
| **GitHub Actions**  | SaaS           | YAML          | GitHub-hosted / self-hosted | Ecossistema GitHub, marketplace |
| **GitLab CI**       | SaaS / Self-hosted | YAML      | GitLab / self-hosted     | All-in-one (Git+CI+Registry)   |
| **Jenkins**         | Self-hosted    | Groovy/YAML   | Agents auto-provisionados| Flexibilidade total, plugins   |
| **CircleCI**        | SaaS           | YAML          | Cloud / self-hosted      | Velocidade, orbs reutilizáveis |
| **Azure DevOps**    | SaaS / Self-hosted | YAML      | Microsoft-hosted / self-hosted | Integração Microsoft         |
| **ArgoCD**          | Self-hosted    | YAML          | GitOps nativo            | Deploy GitOps para Kubernetes  |

**Exemplo completo — GitHub Actions:**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: SAST com Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: p/default
      - name: Dependency Scan
        run: npx audit-ci --critical
      - name: Secret Scan
        uses: gitleaks/gitleaks-action@v2

  build:
    runs-on: ubuntu-latest
    needs: security
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
      - name: Scan de Container com Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: |
          kubectl set image deployment/api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/api --timeout=300s

  deploy-prod:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production   # requer aprovação manual
    steps:
      - uses: actions/checkout@v4
      - run: |
          kubectl set image deployment/api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/api --timeout=300s
      - name: Smoke Test
        run: |
          for i in $(seq 1 10); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.minha-empresa.com/health)
            if [ "$STATUS" != "200" ]; then
              echo "❌ Smoke test falhou (HTTP $STATUS)"
              kubectl rollout undo deployment/api
              exit 1
            fi
            sleep 5
          done
          echo "✅ Smoke test passou"
```

---

## Ambientes

### Paridade entre Ambientes

| Aspecto                | Dev                  | Staging                  | Prod                     |
|------------------------|----------------------|--------------------------|--------------------------|
| **Infra**              | Menor escala, mesma arquitetura | Réplica de prod (menor escala) | Full scale          |
| **Banco de dados**     | Postgres local/container | Postgres RDS (menor)  | Postgres RDS Multi-AZ    |
| **Cache**              | Redis container      | ElastiCache (menor)      | ElastiCache cluster      |
| **Secrets**            | `.env` local         | Secrets Manager          | Secrets Manager + rotação|
| **DNS**                | localhost             | staging.empresa.com      | api.empresa.com          |
| **TLS**                | Self-signed / mkcert | Cert válido (Let's Encrypt) | Cert válido (ACM/LE)  |
| **Monitoramento**      | Logs locais          | Datadog/Grafana          | Datadog/Grafana + alertas|
| **Feature Flags**      | Tudo habilitado      | Selecionáveis            | Controlado por flag      |

### Gestão de Variáveis de Ambiente

**Hierarquia de configuração (do mais ao menos prioritário):**

1. Variáveis de ambiente do runtime (injetadas pelo deploy)
2. Secrets Manager / Vault
3. Arquivos de configuração por ambiente
4. Valores padrão no código

```bash
# .env.example — documentação das variáveis (sem valores reais!)
# Copie para .env e preencha os valores locais

# === Aplicação ===
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# === Banco de Dados ===
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp_dev
DATABASE_POOL_SIZE=5

# === Cache ===
REDIS_URL=redis://localhost:6379/0

# === Autenticação ===
JWT_SECRET=                      # gerar com: openssl rand -hex 32
JWT_EXPIRATION=3600

# === Serviços Externos ===
STRIPE_API_KEY=                  # sk_test_... para dev
SENDGRID_API_KEY=

# === Feature Flags ===
FEATURE_NOVO_CHECKOUT=true
```

**Nunca faça:**
- ❌ Commitar `.env` com valores reais
- ❌ Hardcoded secrets no código
- ❌ Variáveis diferentes entre staging e prod (exceto valores)
- ❌ Usar dados de produção em dev sem anonimização

**Sempre faça:**
- ✅ Manter `.env.example` atualizado e commitado
- ✅ Validar variáveis na inicialização da aplicação
- ✅ Usar Secrets Manager para credenciais em staging/prod
- ✅ Documentar cada variável com comentário explicativo

### Dados de Teste vs. Produção

| Prática                          | Detalhes                                                   |
|----------------------------------|------------------------------------------------------------|
| **Seed scripts**                 | Scripts determinísticos para popular banco de dev          |
| **Factories / Fixtures**         | Gerar dados fake com Faker, Factory Bot, Fishery           |
| **Anonimização**                 | Se usar dump de prod, anonimizar PII (nomes, emails, CPFs) |
| **Subset de dados**              | Copiar apenas subconjunto representativo de prod           |
| **Ferramentas de mascaramento**  | Delphix, Tonic.ai, ou scripts custom com hashing           |
| **LGPD/GDPR**                    | Nunca dados reais de usuários fora de prod                 |

```python
# Exemplo de seed com Faker (Python)
from faker import Faker

fake = Faker('pt_BR')

def seed_usuarios(db, quantidade=100):
    for _ in range(quantidade):
        db.usuarios.insert({
            "nome": fake.name(),
            "email": fake.email(),
            "cpf": fake.cpf(),            # CPF fictício válido
            "telefone": fake.phone_number(),
            "endereco": fake.address(),
            "criado_em": fake.date_time_between(start_date='-1y')
        })
```

---

## Containerização

### Docker — Boas Práticas de Dockerfile

**Dockerfile otimizado (multi-stage, non-root):**

```dockerfile
# ============================================
# STAGE 1: Dependências
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# ============================================
# STAGE 2: Build
# ============================================
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================
# STAGE 3: Runtime (imagem final)
# ============================================
FROM node:20-alpine AS runtime

# Segurança: executar como non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copiar apenas o necessário
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Não rodar como root
USER appuser

# Metadata
LABEL maintainer="equipe-platform@empresa.com"
LABEL version="1.0.0"

# Health check embutido
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**Checklist de Dockerfile:**

| Regra                                | Motivo                                              |
|--------------------------------------|------------------------------------------------------|
| Usar imagem base `alpine` ou `slim`  | Menor superfície de ataque e tamanho da imagem       |
| Multi-stage build                    | Imagem final sem ferramentas de build                |
| Usuário non-root (`USER`)            | Princípio do menor privilégio                        |
| `COPY` específico (não `COPY . .` no final) | Evitar copiar arquivos desnecessários        |
| `.dockerignore` completo             | Reduzir contexto de build e tamanho da imagem        |
| Pinned versions (`node:20.11-alpine`)| Builds reproduzíveis                                 |
| `npm ci` em vez de `npm install`     | Instalação determinística (respeita lock file)       |
| Sem `apt-get upgrade` genérico       | Usar imagem base atualizada, não upgrades no build   |
| `HEALTHCHECK` definido               | Orquestradores sabem se o container está saudável    |
| Um processo por container            | Separação de responsabilidades                       |

**.dockerignore recomendado:**

```
.git
.gitignore
.env
.env.*
node_modules
npm-debug.log
Dockerfile
docker-compose*.yml
.dockerignore
README.md
docs/
tests/
coverage/
.github/
.vscode/
*.md
```

### Docker Compose para Desenvolvimento

```yaml
# docker-compose.yml — ambiente de desenvolvimento completo
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: build    # usar stage de build para dev (com devDependencies)
    ports:
      - "3000:3000"
      - "9229:9229"   # debug port
    volumes:
      - .:/app
      - /app/node_modules  # preservar node_modules do container
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app:secret@postgres:5432/myapp_dev
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp_dev"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # UI

volumes:
  pgdata:
```

### Kubernetes — Quando Usar e Quando Não Usar

| ✅ Use Kubernetes quando...                  | ❌ Não use Kubernetes quando...                 |
|----------------------------------------------|-------------------------------------------------|
| Múltiplos serviços/microserviços             | Monolito simples com 1-3 instâncias             |
| Necessidade de auto-scaling granular         | Tráfego previsível e constante                  |
| Time tem experiência com K8s                 | Time pequeno sem experiência em K8s             |
| Multi-cloud ou hybrid-cloud                  | Single-cloud com serviços gerenciados           |
| Deploys frequentes (várias vezes ao dia)     | Deploys semanais/mensais                        |
| Alta disponibilidade crítica                 | Downtime aceitável (ex: ferramenta interna)     |
| Workloads heterogêneos (batch + web + workers)| Apenas uma aplicação web                       |

**Alternativas mais simples ao Kubernetes:**
- **AWS ECS Fargate** — containers sem gerenciar servidores
- **Google Cloud Run** — containers serverless
- **Azure Container Apps** — similar ao Cloud Run
- **Railway / Render / Fly.io** — PaaS para containers
- **Docker Compose + Swarm** — para cenários menores

### Helm Charts

```yaml
# values.yaml — valores parametrizáveis
replicaCount: 3

image:
  repository: ghcr.io/minha-empresa/api
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.empresa.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.empresa.com

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

env:
  - name: NODE_ENV
    value: production
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: api-secrets
        key: database-url
```

**Comandos Helm essenciais:**

```bash
# Instalar release
helm install minha-api ./charts/api -f values-prod.yaml -n production

# Atualizar release
helm upgrade minha-api ./charts/api -f values-prod.yaml -n production

# Rollback
helm rollback minha-api 2 -n production

# Ver histórico
helm history minha-api -n production

# Template para debug (renderizar sem aplicar)
helm template minha-api ./charts/api -f values-prod.yaml
```

### Registry de Containers

| Registry                   | Tipo           | Scan Integrado | Ideal Para                        |
|----------------------------|----------------|----------------|-----------------------------------|
| **GitHub Container Registry** | SaaS        | Dependabot     | Projetos no GitHub                |
| **Docker Hub**             | SaaS           | Scout          | Imagens públicas / open-source    |
| **AWS ECR**                | Gerenciado     | Inspector      | Ecossistema AWS                   |
| **GCP Artifact Registry**  | Gerenciado     | On-Demand Scan | Ecossistema GCP                   |
| **Azure ACR**              | Gerenciado     | Defender        | Ecossistema Azure                |
| **Harbor**                 | Self-hosted    | Trivy embutido | Controle total, air-gapped        |
| **GitLab Container Registry** | SaaS/Self  | GitLab Scanner | Projetos no GitLab                |

---

## Monitoramento e Observabilidade

### Os Três Pilares

```mermaid
flowchart TB
    O["Observabilidade"] --> M["Métricas"]
    O --> L["Logs"]
    O --> T["Traces"]
    M --> M1["O que está acontecendo?<br/>Latência, throughput, erros"]
    L --> L1["Por que aconteceu?<br/>Detalhes, stack traces"]
    T --> T1["Onde aconteceu?<br/>Fluxo entre serviços"]
```

### Métricas

| Ferramenta       | Tipo            | Melhor Para                           | Retenção Padrão  |
|------------------|-----------------|---------------------------------------|-------------------|
| **Prometheus**   | Open-source     | Kubernetes, métricas custom           | 15 dias (local)   |
| **Grafana**      | Open-source     | Dashboards, visualização              | N/A (frontend)    |
| **Datadog**      | SaaS            | All-in-one (métricas+logs+APM)        | 15 meses          |
| **CloudWatch**   | Gerenciado AWS  | Serviços AWS nativos                  | 15 meses          |
| **New Relic**    | SaaS            | APM + infraestrutura                  | 8 dias (free)     |

**Métricas essenciais (RED + USE):**

| Método | Métrica                    | O que Mede                             | Alerta Quando                   |
|--------|----------------------------|----------------------------------------|---------------------------------|
| RED    | **R**ate (taxa)            | Requisições por segundo                | Queda > 30% em 5 min           |
| RED    | **E**rrors (erros)         | % de requisições com erro              | > 1% de erros em 5 min         |
| RED    | **D**uration (duração)     | Latência (p50, p95, p99)               | p99 > 2s                       |
| USE    | **U**tilization            | % de uso de CPU/memória/disco          | CPU > 80%, mem > 85%           |
| USE    | **S**aturation             | Fila de trabalho, threads em espera    | Queue depth > 1000             |
| USE    | **E**rrors                 | Erros de hardware/sistema              | Qualquer erro                  |

### Logs

| Ferramenta            | Stack            | Custo             | Ideal Para                          |
|-----------------------|------------------|--------------------|-------------------------------------|
| **ELK (Elasticsearch + Logstash + Kibana)** | Open-source | Alto (Elasticsearch é pesado) | Grandes volumes, busca avançada |
| **Loki + Grafana**    | Open-source      | Baixo              | Kubernetes, custo-benefício         |
| **CloudWatch Logs**   | Gerenciado AWS   | Pay-per-use        | Serviços AWS                        |
| **Datadog Logs**      | SaaS             | Alto               | Correlação com métricas e APM       |
| **Fluentd / Fluent Bit** | Open-source  | Gratuito (coletor) | Coletor universal de logs           |

**Boas práticas de logging:**

```json
{
  "timestamp": "2026-06-05T14:30:00.123Z",
  "level": "error",
  "service": "api-pedidos",
  "traceId": "abc123def456",
  "spanId": "789xyz",
  "userId": "usr_42",
  "method": "POST",
  "path": "/api/v1/pedidos",
  "statusCode": 500,
  "duration_ms": 234,
  "error": {
    "type": "DatabaseConnectionError",
    "message": "Connection refused to postgres:5432",
    "stack": "Error: Connection refused..."
  },
  "metadata": {
    "pedidoId": "ped_123",
    "valor": 199.90
  }
}
```

| Regra                                    | Motivo                                            |
|------------------------------------------|---------------------------------------------------|
| Logs em JSON estruturado                 | Facilita parsing e queries                        |
| Incluir `traceId` e `spanId`             | Correlação com traces distribuídos                |
| Não logar PII (CPF, senha, cartão)       | Conformidade LGPD/GDPR e segurança               |
| Níveis corretos (debug/info/warn/error)  | Filtrar ruído em produção                         |
| Timestamp em UTC ISO 8601               | Consistência entre serviços e fusos               |
| Não logar payloads completos de request  | Reduzir volume e evitar vazamento de dados        |

### Traces (Rastreamento Distribuído)

| Ferramenta          | Tipo           | Protocolo          | Ideal Para                     |
|---------------------|----------------|--------------------|---------------------------------|
| **OpenTelemetry**   | Open-source    | OTLP               | Padrão universal, vendor-neutral|
| **Jaeger**          | Open-source    | OpenTracing/OTLP   | Kubernetes, self-hosted         |
| **Zipkin**          | Open-source    | Zipkin / OTLP      | Simples, leve                   |
| **AWS X-Ray**       | Gerenciado     | X-Ray SDK          | Ecossistema AWS                 |
| **Datadog APM**     | SaaS           | OTLP / dd-trace    | All-in-one com métricas e logs  |

```python
# Instrumentação com OpenTelemetry (Python)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Configurar provider
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("api-pedidos")

# Uso em código
@app.post("/api/v1/pedidos")
async def criar_pedido(pedido: PedidoRequest):
    with tracer.start_as_current_span("criar_pedido") as span:
        span.set_attribute("pedido.valor", pedido.valor)
        span.set_attribute("pedido.itens", len(pedido.itens))

        with tracer.start_as_current_span("validar_estoque"):
            await validar_estoque(pedido.itens)

        with tracer.start_as_current_span("processar_pagamento"):
            resultado = await processar_pagamento(pedido)

        span.set_attribute("pedido.id", resultado.id)
        return resultado
```

### Alertas

**Regras de ouro para alertas:**

| Princípio                        | Detalhes                                                     |
|----------------------------------|--------------------------------------------------------------|
| **Alertar sobre sintomas, não causas** | Alerta: "latência alta" — Não: "CPU alta"              |
| **Cada alerta é acionável**     | Se não precisa de ação, é notificação, não alerta            |
| **Evitar alert fatigue**        | Máximo 5-10 alertas críticos por serviço                     |
| **Severidades claras**          | P1 (Critical), P2 (High), P3 (Medium), P4 (Low)             |
| **Runbook linkado**             | Todo alerta aponta para documentação de resolução            |
| **Escalonamento automático**    | P1 não respondido em 15 min → escalar para gerente           |

**Exemplo de política de escalonamento:**

| Severidade | Tempo de Resposta | Escalonamento              | Canal                       |
|------------|-------------------|----------------------------|-----------------------------|
| **P1**     | 5 min             | Eng → Tech Lead → CTO     | PagerDuty + telefone        |
| **P2**     | 30 min            | Eng → Tech Lead            | PagerDuty + Slack           |
| **P3**     | 4 horas           | Eng de plantão             | Slack #alertas              |
| **P4**     | Próximo dia útil   | Backlog do time           | Slack #alertas-low          |

### SLIs, SLOs e SLAs

| Conceito | Definição                                     | Exemplo                                        |
|----------|-----------------------------------------------|-------------------------------------------------|
| **SLI**  | Indicador de Nível de Serviço (métrica)       | Latência p99 das requisições HTTP               |
| **SLO**  | Objetivo de Nível de Serviço (meta interna)   | 99.9% das requisições com latência < 500ms      |
| **SLA**  | Acordo de Nível de Serviço (contrato externo) | 99.95% de disponibilidade ou crédito de fatura  |

**SLOs recomendados por tipo de serviço:**

| Serviço               | SLI                                | SLO                                |
|-----------------------|------------------------------------|-------------------------------------|
| API pública           | Disponibilidade (HTTP 200)         | 99.95% em 30 dias                  |
| API pública           | Latência p99                       | < 500ms                            |
| API interna           | Disponibilidade                    | 99.9% em 30 dias                   |
| Processamento batch   | Jobs completados com sucesso       | 99.5% em 7 dias                    |
| Banco de dados        | Queries sem timeout                | 99.99%                             |
| CDN / Assets          | Cache hit rate                     | > 95%                              |

**Error budget:**

```
Error Budget = 1 - SLO
Exemplo: SLO = 99.9% → Error Budget = 0.1% do período

Em 30 dias = 43.200 minutos
Error Budget = 43.200 × 0.001 = 43,2 minutos de downtime permitido

Se o budget acabar → congelar deploys, focar em confiabilidade
```

### Dashboards Essenciais

| Dashboard                | Métricas Incluídas                                         |
|--------------------------|------------------------------------------------------------|
| **Overview do Sistema**  | Uptime, requisições/s, erros/s, latência p50/p95/p99       |
| **Por Serviço**          | RED metrics, pods running, restarts, resource usage         |
| **Banco de Dados**       | Connections, query time, replication lag, disk usage         |
| **Infraestrutura**       | CPU, memória, disco, rede por node/instância                |
| **Negócio**              | Pedidos/min, receita/hora, carrinhos abandonados            |
| **Custos**               | Gasto diário/mensal por serviço, tendência, anomalias       |
| **SLO**                  | Error budget restante, burn rate, tendência de violação     |

---

## Segurança na Infraestrutura

### Secrets Management

| Ferramenta               | Tipo            | Rotação Automática | Ideal Para                       |
|--------------------------|-----------------|---------------------|----------------------------------|
| **HashiCorp Vault**      | Open-source     | Sim                 | Multi-cloud, políticas avançadas |
| **AWS Secrets Manager**  | Gerenciado      | Sim (RDS, Redshift) | Ecossistema AWS                  |
| **AWS SSM Parameter Store** | Gerenciado   | Manual              | Configs + secrets simples (AWS)  |
| **Azure Key Vault**      | Gerenciado      | Sim                 | Ecossistema Azure                |
| **GCP Secret Manager**   | Gerenciado      | Manual              | Ecossistema GCP                  |
| **Doppler**              | SaaS            | Manual              | Times distribuídos, multi-cloud  |
| **SOPS (Mozilla)**       | Open-source     | Manual              | Secrets encriptados no Git       |

```bash
# Exemplo: SOPS para secrets no Git (encriptados com KMS)
# Encriptar arquivo
sops --encrypt --kms "arn:aws:kms:us-east-1:123:key/abc" \
  secrets.yaml > secrets.enc.yaml

# Decriptar e usar
sops --decrypt secrets.enc.yaml

# Editar in-place
sops secrets.enc.yaml

# Conteúdo encriptado (seguro para commitar):
# database_url: ENC[AES256_GCM,data:abc123...,tag:xyz...]
# api_key: ENC[AES256_GCM,data:def456...,tag:uvw...]
```

### HTTPS/TLS

| Aspecto                       | Recomendação                                                |
|-------------------------------|-------------------------------------------------------------|
| **Certificados**              | Let's Encrypt (gratuito) ou AWS ACM (gerenciado)            |
| **Renovação**                 | Automática (cert-manager no K8s, ACM na AWS)                |
| **Versão mínima**             | TLS 1.2 (desabilitar TLS 1.0 e 1.1)                        |
| **Cipher suites**             | Preferir AEAD (AES-GCM, ChaCha20-Poly1305)                 |
| **HSTS**                      | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| **Comunicação interna**       | mTLS entre serviços (Istio, Linkerd, ou cert-manager)       |
| **Redirect HTTP → HTTPS**     | Sempre, no load balancer ou ingress                         |

### Firewall e Segmentação de Rede

```mermaid
flowchart TB
    Internet["Internet"] --> WAF["WAF<br/>(AWS WAF / Cloudflare)"]
    WAF --> LB["Load Balancer<br/>(Subnet Pública)"]
    LB --> App["Aplicação<br/>(Subnet Privada)"]
    App --> DB["Banco de Dados<br/>(Subnet Isolada)"]
    App --> Cache["Redis/Cache<br/>(Subnet Isolada)"]

    subgraph VPC ["VPC / Virtual Network"]
        subgraph pub ["Subnet Pública"]
            LB
        end
        subgraph priv ["Subnet Privada"]
            App
        end
        subgraph iso ["Subnet Isolada"]
            DB
            Cache
        end
    end
```

**Regras de Security Group (AWS):**

| Recurso        | Inbound                              | Outbound                           |
|----------------|---------------------------------------|-------------------------------------|
| Load Balancer  | 443 (HTTPS) de 0.0.0.0/0             | 3000 para App SG                   |
| Aplicação      | 3000 do LB SG                        | 5432 para DB SG, 6379 para Redis SG |
| Banco de Dados | 5432 do App SG                        | Nenhum (ou para backup)            |
| Redis          | 6379 do App SG                        | Nenhum                             |

### IAM — Princípio do Menor Privilégio

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadOnlyOneBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::meu-bucket-uploads",
        "arn:aws:s3:::meu-bucket-uploads/*"
      ]
    }
  ]
}
```

| Prática                              | Detalhes                                                    |
|--------------------------------------|--------------------------------------------------------------|
| **Roles, não usuários**             | Aplicações usam IAM Roles, não access keys                   |
| **Políticas específicas**           | Nunca `*` em Action ou Resource                               |
| **Boundary policies**               | Limitar o máximo que uma role pode ter                        |
| **Audit regular**                   | AWS IAM Access Analyzer para permissões não utilizadas       |
| **MFA obrigatório**                 | Para todos os acessos humanos ao console                      |
| **Chaves temporárias**              | Usar STS AssumeRole com expiração curta                       |
| **Service accounts (K8s)**          | IRSA (IAM Roles for Service Accounts) na AWS                  |

### WAF e DDoS Protection

| Camada              | Ferramenta                         | Protege Contra                         |
|---------------------|------------------------------------|-----------------------------------------|
| **L3/L4 DDoS**     | AWS Shield Standard (gratuito)     | Volumétrico (SYN flood, UDP flood)     |
| **L7 DDoS**        | AWS Shield Advanced, Cloudflare    | HTTP flood, slowloris                  |
| **WAF**            | AWS WAF, Cloudflare WAF, ModSecurity | SQLi, XSS, CSRF, bots                |
| **Rate Limiting**  | API Gateway, Nginx, Cloudflare     | Brute force, abuso de API             |
| **Bot Protection** | Cloudflare Bot Management, reCAPTCHA | Scraping, credential stuffing        |

### Scan de Vulnerabilidades em Containers

```bash
# Trivy — scan de imagem de container
trivy image --severity CRITICAL,HIGH ghcr.io/empresa/api:latest

# Trivy — scan de filesystem (IaC + secrets + vulnerabilities)
trivy fs --security-checks vuln,secret,config .

# Grype — alternativa ao Trivy
grype ghcr.io/empresa/api:latest --fail-on critical

# Snyk Container
snyk container test ghcr.io/empresa/api:latest --severity-threshold=high
```

**Integração no CI (GitHub Actions):**

```yaml
- name: Scan com Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/empresa/api:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### Atualizações Automatizadas

| Ferramenta       | O que Atualiza               | Config                              |
|------------------|------------------------------|--------------------------------------|
| **Dependabot**   | Dependências do projeto      | `.github/dependabot.yml`            |
| **Renovate**     | Dependências + Docker + Helm | `renovate.json`                     |
| **Snyk**         | Dependências + containers    | Dashboard + `.snyk`                 |

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "terraform"
    directory: "/environments/prod"
    schedule:
      interval: "monthly"
```

### Rotação de Credenciais

| Credencial             | Frequência Mínima | Método                                           |
|------------------------|--------------------|--------------------------------------------------|
| **DB passwords**       | 90 dias            | Secrets Manager com rotação automática           |
| **API keys**           | 90 dias            | Gerar nova, atualizar, revogar antiga            |
| **TLS certificates**   | 90 dias (LE) / 1 ano | cert-manager renova automaticamente           |
| **SSH keys**           | 180 dias           | Trocar par de chaves, atualizar authorized_keys  |
| **IAM access keys**    | 90 dias            | Criar nova, atualizar sistemas, desativar antiga |
| **Tokens de serviço**  | 30-90 dias         | Automação via Vault com leases                   |
| **Encryption keys**    | 1 ano              | KMS key rotation automática                      |

### Network Policies (Kubernetes)

```yaml
# Permitir apenas tráfego do frontend para o backend na porta 3000
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 3000

---
# Default deny: bloquear todo tráfego não explicitamente permitido
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Backup Encriptado

```bash
# Backup encriptado do PostgreSQL com gpg
pg_dump -h db.empresa.com -U app myapp_prod \
  | gzip \
  | gpg --symmetric --cipher-algo AES256 --passphrase-file /secrets/backup-key \
  > backup-$(date +%Y%m%d-%H%M%S).sql.gz.gpg

# Upload para S3 com encriptação server-side
aws s3 cp backup-*.sql.gz.gpg \
  s3://empresa-backups/postgres/ \
  --sse aws:kms \
  --sse-kms-key-id "arn:aws:kms:us-east-1:123:key/abc"

# Restaurar
aws s3 cp s3://empresa-backups/postgres/backup-20260605.sql.gz.gpg .
gpg --decrypt --passphrase-file /secrets/backup-key backup-20260605.sql.gz.gpg \
  | gunzip \
  | psql -h db.empresa.com -U app myapp_prod
```

### Logs Centralizados e Imutáveis

| Prática                                  | Implementação                                          |
|------------------------------------------|--------------------------------------------------------|
| **Centralização**                        | Fluent Bit → Loki/Elasticsearch/CloudWatch             |
| **Imutabilidade**                        | S3 Object Lock (WORM), CloudWatch Logs                 |
| **Retenção**                             | 90 dias hot, 1 ano warm, 7 anos cold (compliance)      |
| **Controle de acesso**                   | Apenas admins de segurança podem deletar logs          |
| **Integridade**                          | Hashing de log files (CloudTrail Log File Validation)  |
| **Alertas sobre alteração**              | Alerta se alguém tenta desabilitar logging             |

---

## Backup e Disaster Recovery

### Estratégias de Backup

| Estratégia         | Descrição                                          | Espaço | Velocidade de Restore | Ideal Para              |
|--------------------|----------------------------------------------------|--------|------------------------|--------------------------|
| **Full**           | Backup completo de todos os dados                  | Alto   | Rápido                 | Semanal                  |
| **Incremental**    | Apenas dados alterados desde o último backup       | Baixo  | Lento (precisa de todos) | Diário (entre fulls)  |
| **Diferencial**    | Dados alterados desde o último full                | Médio  | Médio                  | Diário (alternativa)     |
| **Snapshot**       | Snapshot no nível de storage/VM                    | Baixo* | Muito rápido           | Banco de dados, discos   |
| **Contínuo (PITR)**| Log shipping contínuo (Point-in-Time Recovery)     | Baixo  | Rápido + preciso       | Bancos de dados críticos |

**Esquema recomendado (regra 3-2-1):**
- **3** cópias dos dados
- **2** tipos de mídia/storage diferentes
- **1** cópia off-site (outra região ou outro cloud)

```bash
# Exemplo: backup strategy para PostgreSQL
# Full backup semanal (domingo 2h)
0 2 * * 0 /scripts/backup-full.sh

# Incremental diário (seg-sáb 2h) usando WAL archiving
0 2 * * 1-6 /scripts/backup-incremental.sh

# PITR habilitado via:
# archive_mode = on
# archive_command = 'aws s3 cp %p s3://backups/wal/%f'
```

### RTO e RPO

| Métrica | Significado                                     | Pergunta que Responde                        |
|---------|--------------------------------------------------|----------------------------------------------|
| **RPO** | Recovery Point Objective (Objetivo de Ponto)    | "Quantos dados posso perder?"                |
| **RTO** | Recovery Time Objective (Objetivo de Tempo)     | "Quanto tempo posso ficar fora do ar?"       |

**Exemplos por tipo de sistema:**

| Sistema                | RPO                | RTO                | Estratégia                              |
|------------------------|--------------------|--------------------|-----------------------------------------|
| E-commerce (checkout)  | 0 (zero data loss) | 5 minutos          | Multi-AZ, replicação síncrona, failover |
| Blog corporativo       | 24 horas           | 4 horas            | Backup diário, restore manual           |
| Sistema financeiro     | 0                  | 1 minuto           | Multi-region active-active              |
| Data warehouse         | 1 hora             | 2 horas            | Snapshots horários, restore automático  |
| App interna do time    | 24 horas           | 24 horas           | Backup diário, restore manual           |

### Testes de Restore

| Prática                             | Frequência        | Detalhes                                              |
|-------------------------------------|-------------------|-------------------------------------------------------|
| **Restore automatizado**            | Semanal           | Pipeline que restaura backup em ambiente de teste     |
| **Validação de integridade**        | Cada backup       | Checksums + verificação de tamanho                    |
| **Restore completo (DR drill)**     | Trimestral        | Simular perda total e restaurar tudo do zero          |
| **Teste de PITR**                   | Mensal            | Restaurar para um ponto específico no tempo           |
| **Documentação do restore**         | Cada teste        | Atualizar runbook com tempo real e problemas          |

```bash
# Script de teste automatizado de restore
#!/bin/bash
set -euo pipefail

echo "🔄 Iniciando teste de restore..."

# 1. Baixar backup mais recente
LATEST=$(aws s3 ls s3://backups/postgres/full/ --recursive \
  | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://backups/postgres/$LATEST" /tmp/restore-test.sql.gz.gpg

# 2. Decriptar e restaurar em banco de teste
gpg --decrypt --passphrase-file /secrets/backup-key \
  /tmp/restore-test.sql.gz.gpg | gunzip | \
  psql -h test-db.internal -U admin restore_test_db

# 3. Validar dados
USERS=$(psql -h test-db.internal -U admin restore_test_db \
  -t -c "SELECT COUNT(*) FROM users")
if [ "$USERS" -lt 1000 ]; then
  echo "❌ Restore falhou: apenas $USERS usuários (esperado > 1000)"
  exit 1
fi

# 4. Limpar
psql -h test-db.internal -U admin -c "DROP DATABASE restore_test_db"

echo "✅ Teste de restore concluído com sucesso ($USERS usuários)"
```

### Plano de Disaster Recovery

**Documento deve conter:**

1. **Inventário de sistemas críticos** — lista ordenada por prioridade de restauração
2. **RPO e RTO por sistema** — acordado com o negócio
3. **Procedimentos de failover** — passo a passo detalhado (runbook)
4. **Contatos de emergência** — telefones, não apenas Slack
5. **Fornecedores críticos** — suporte AWS/GCP/Azure, DNS, CDN
6. **Sequência de restauração** — qual sistema subir primeiro (banco → API → frontend)
7. **Comunicação** — template de status page, email para clientes
8. **Pós-incidente** — checklist de validação, post-mortem

### Multi-Region

| Padrão                  | RPO      | RTO        | Custo    | Complexidade |
|-------------------------|----------|------------|----------|--------------|
| **Backup & Restore**   | Horas    | Horas      | Baixo    | Baixa        |
| **Pilot Light**        | Minutos  | 30-60 min  | Médio    | Média        |
| **Warm Standby**       | Segundos | Minutos    | Alto     | Alta         |
| **Active-Active**      | 0        | ~0         | Muito alto | Muito alta |

---

## Testes na Infraestrutura

### Smoke Tests Após Deploy

```bash
#!/bin/bash
# smoke-test.sh — executar imediatamente após cada deploy

BASE_URL="${1:-https://api.empresa.com}"
FAILURES=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$STATUS" == "$expected_status" ]; then
    echo "✅ $name (HTTP $STATUS)"
  else
    echo "❌ $name (HTTP $STATUS, esperado $expected_status)"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "🔍 Executando smoke tests em $BASE_URL..."

check "Health Check"     "$BASE_URL/health"
check "Readiness"        "$BASE_URL/ready"
check "API Version"      "$BASE_URL/api/v1/version"
check "Auth (sem token)" "$BASE_URL/api/v1/me" "401"
check "Not Found"        "$BASE_URL/api/v1/nao-existe" "404"

# Verificar tempo de resposta
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/health")
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "⚠️  Health check lento: ${RESPONSE_TIME}s (limite: 2s)"
  FAILURES=$((FAILURES + 1))
fi

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES smoke test(s) falharam — ROLLBACK RECOMENDADO"
  exit 1
else
  echo "✅ Todos os smoke tests passaram"
  exit 0
fi
```

### Health Checks

```yaml
# Kubernetes: liveness, readiness, startup probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/empresa/api:latest

          # Startup Probe: verifica se a aplicação iniciou
          # (não mata o pod durante startup lento)
          startupProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30     # 30 × 5s = 150s para iniciar

          # Liveness Probe: aplicação está viva?
          # Se falhar, Kubernetes reinicia o pod
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness Probe: aplicação pode receber tráfego?
          # Se falhar, remove do Service (não recebe tráfego)
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
```

**Endpoints de health check recomendados:**

```python
# /health — liveness (a aplicação está rodando?)
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# /ready — readiness (a aplicação pode atender requisições?)
@app.get("/ready")
async def ready():
    checks = {}

    # Verificar banco de dados
    try:
        await db.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    # Verificar Redis
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if all_ok else "not_ready", "checks": checks}
    )
```

### Chaos Engineering

| Ferramenta          | Plataforma       | Tipo de Falha                             |
|---------------------|------------------|-------------------------------------------|
| **Chaos Monkey**    | Netflix/AWS      | Matar instâncias aleatoriamente           |
| **Litmus**          | Kubernetes       | Pod kill, network delay, disk fill        |
| **Chaos Mesh**      | Kubernetes       | Falhas de rede, I/O, stress de recursos   |
| **Gremlin**         | Multi-plataforma | Falhas controladas com UI (SaaS)          |
| **AWS FIS**         | AWS              | Falhas em serviços AWS (EC2, ECS, RDS)    |
| **Toxiproxy**       | Qualquer         | Latência e falhas de rede entre serviços  |

**Princípios de chaos engineering:**

1. **Comece em staging** — nunca começar direto em produção
2. **Blast radius pequeno** — limitar impacto (1 pod, 1 instância)
3. **Hipótese documentada** — "Se matarmos 1 pod, o serviço continua respondendo"
4. **Monitoramento durante** — observar métricas em tempo real
5. **Kill switch** — poder parar o experimento imediatamente
6. **Game days** — agendar com o time, não fazer surpresa

```yaml
# Exemplo: Litmus ChaosEngine (Kubernetes)
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-chaos
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: "app=api"
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"           # 30 segundos
            - name: CHAOS_INTERVAL
              value: "10"           # a cada 10 segundos
            - name: FORCE
              value: "false"
```

### DR Drills

| Tipo de Drill               | Frequência   | Escopo                                        |
|-----------------------------|--------------|-----------------------------------------------|
| **Tabletop exercise**       | Trimestral   | Discussão teórica do plano de DR              |
| **Failover de banco**       | Mensal       | Promover réplica para primário                |
| **Failover de região**      | Semestral    | Migrar tráfego para região secundária         |
| **Full DR drill**           | Anual        | Simular perda total da região primária        |
| **Restore from scratch**    | Trimestral   | Reconstruir ambiente do zero usando IaC + backups |

### Compliance Scanning

| Framework          | Ferramenta                      | O que Verifica                           |
|--------------------|----------------------------------|------------------------------------------|
| **CIS Benchmarks** | Prowler, ScoutSuite, kube-bench | Configuração segura de cloud/K8s         |
| **PCI DSS**        | Prowler, AWS Security Hub       | Requisitos para processamento de cartão  |
| **SOC 2**          | Vanta, Drata, AWS Audit Manager | Controles de segurança e disponibilidade |
| **LGPD/GDPR**      | Custom policies, OneTrust       | Proteção de dados pessoais               |

```bash
# Prowler — audit de segurança AWS
prowler aws --compliance cis_2.0

# kube-bench — CIS benchmark para Kubernetes
kube-bench run --targets master,node

# Checkov — scan de IaC
checkov -d environments/prod/ --framework terraform
```

---

## Custo

### Right-Sizing de Instâncias

| Passo | Ação                                                       | Ferramenta                           |
|-------|-------------------------------------------------------------|--------------------------------------|
| 1     | Coletar métricas de CPU e memória por 2-4 semanas          | CloudWatch, Datadog, Prometheus      |
| 2     | Identificar instâncias com uso < 30% (CPU/memória)        | AWS Compute Optimizer, Google Recommender |
| 3     | Redimensionar para tipo menor                              | Terraform, console                   |
| 4     | Monitorar pós-mudança por 1 semana                        | Alertas de saturação                 |
| 5     | Repetir trimestralmente                                    | Processo recorrente                  |

### Spot / Preemptible Instances

| Cloud | Nome                 | Economia     | Quando Usar                            |
|-------|----------------------|--------------|----------------------------------------|
| AWS   | Spot Instances       | Até 90%      | CI/CD runners, batch processing, dev   |
| GCP   | Preemptible / Spot VMs | Até 91%   | Jobs de processamento de dados         |
| Azure | Spot VMs             | Até 90%      | Testes de carga, workloads tolerantes  |

**Nunca usar Spot para:**
- ❌ Bancos de dados
- ❌ Serviços stateful sem replicação
- ❌ Aplicações que não toleram interrupção

### Auto-Scaling

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300     # esperar 5 min antes de reduzir
      policies:
        - type: Percent
          value: 25
          periodSeconds: 120
```

### Reserved Instances / Savings Plans

| Tipo                         | Compromisso | Economia   | Flexibilidade          |
|------------------------------|-------------|------------|------------------------|
| **Reserved Instances (RI)**  | 1 ou 3 anos | 30-72%    | Fixa (tipo + região)   |
| **Savings Plans (Compute)** | 1 ou 3 anos | 20-66%    | Qualquer tipo/região   |
| **Savings Plans (EC2)**     | 1 ou 3 anos | 30-72%    | Família fixa, flexível em tamanho |

**Quando reservar:**
- ✅ Bancos de dados que rodam 24/7
- ✅ Serviços core que não mudam de tamanho
- ✅ Kubernetes nodes com baseline previsível
- ❌ Não reservar workloads que podem ser migrados ou eliminados

### Monitoramento de Custo

| Ferramenta                 | Cloud      | Funcionalidades                              |
|----------------------------|------------|----------------------------------------------|
| **AWS Cost Explorer**      | AWS        | Análise de custo, forecast, RI recommendations |
| **AWS Budgets**            | AWS        | Alertas de orçamento                         |
| **Infracost**              | Multi      | Custo de IaC no PR (antes de aplicar)        |
| **Kubecost**               | Kubernetes | Custo por namespace, deployment, pod         |
| **GCP Billing Reports**    | GCP        | Análise detalhada por projeto/serviço        |
| **Azure Cost Management**  | Azure      | Budgets, análise, recommendations            |

```yaml
# Infracost no CI — mostra custo estimado no PR
# .github/workflows/infracost.yml
name: Infracost
on: [pull_request]
jobs:
  infracost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}
      - run: |
          infracost breakdown --path=environments/prod \
            --format=json --out-file=/tmp/infracost.json
      - uses: infracost/actions/comment@v3
        with:
          path: /tmp/infracost.json
          behavior: update
```

**Exemplo de saída do Infracost no PR:**

```
💰 Monthly cost will increase by $142 (from $1,230 → $1,372)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┓
┃ Project                            ┃ Before       ┃ After         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━┫
┃ aws_db_instance.main               ┃ $350         ┃ $450 (+$100)  ┃
┃ aws_instance.worker (×2 → ×3)      ┃ $120         ┃ $162 (+$42)   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━┛
```

---

## Checklist de Revisão Infra

### Infraestrutura como Código

- [ ] Toda infraestrutura está definida em código (nada criado manualmente)
- [ ] State remoto configurado com locking e encriptação
- [ ] Módulos reutilizáveis para recursos comuns
- [ ] Drift detection automatizado (execução periódica)
- [ ] Code review obrigatório para mudanças de infra
- [ ] Ambientes isolados com state separado

### CI/CD

- [ ] Pipeline completo: build → test → scan → deploy
- [ ] Testes unitários com cobertura mínima de 80%
- [ ] SAST executando em toda PR (SonarQube, Semgrep, CodeQL)
- [ ] Scan de dependências (Snyk, Dependabot, OWASP Dep-Check)
- [ ] Scan de secrets no código (Gitleaks, TruffleHog)
- [ ] Scan de container na imagem final (Trivy, Grype)
- [ ] Scan de IaC (Checkov, tfsec, KICS)
- [ ] Estratégia de deploy definida (blue-green, canary, rolling)
- [ ] Rollback automatizado baseado em métricas
- [ ] Deploy para produção requer aprovação manual

### Ambientes

- [ ] Dev, staging e prod com máxima paridade arquitetural
- [ ] `.env.example` atualizado e commitado
- [ ] Secrets gerenciados via Secrets Manager / Vault (nunca no código)
- [ ] Dados de teste gerados (faker/factories), não copiados de prod
- [ ] Variáveis validadas na inicialização da aplicação

### Containerização

- [ ] Dockerfile com multi-stage build
- [ ] Container roda como non-root
- [ ] `.dockerignore` completo
- [ ] Imagens base com versão pinada (não `latest`)
- [ ] HEALTHCHECK definido no Dockerfile
- [ ] Scan de vulnerabilidades na imagem antes do deploy
- [ ] Registry privado com acesso controlado

### Monitoramento e Observabilidade

- [ ] Métricas RED coletadas para cada serviço (Rate, Errors, Duration)
- [ ] Logs em JSON estruturado com traceId
- [ ] Tracing distribuído configurado (OpenTelemetry)
- [ ] Dashboards de overview, por serviço e de negócio
- [ ] Alertas configurados com runbooks linkados
- [ ] SLIs e SLOs definidos para serviços críticos
- [ ] Error budget monitorado
- [ ] On-call configurado com escalonamento automático

### Segurança

- [ ] HTTPS/TLS em toda comunicação (interna e externa)
- [ ] WAF configurado para endpoints públicos
- [ ] DDoS protection habilitado (Shield, Cloudflare)
- [ ] IAM com princípio do menor privilégio (sem `*` em policies)
- [ ] MFA obrigatório para acessos humanos
- [ ] Rotação de credenciais automatizada
- [ ] Network policies restritivas (K8s) ou Security Groups corretos
- [ ] Logs centralizados e imutáveis
- [ ] Atualizações automatizadas (Dependabot/Renovate)
- [ ] Compliance scanning regular (CIS benchmarks)
- [ ] Backup encriptado em repouso e trânsito

### Backup e Disaster Recovery

- [ ] Estratégia de backup definida (3-2-1: 3 cópias, 2 mídias, 1 off-site)
- [ ] RPO e RTO documentados e acordados com o negócio
- [ ] Teste de restore automatizado (semanal)
- [ ] Plano de DR documentado com runbooks detalhados
- [ ] DR drill realizado pelo menos anualmente
- [ ] Multi-region configurado para serviços críticos (quando necessário)
- [ ] Contatos de emergência atualizados

### Custo

- [ ] Right-sizing revisado trimestralmente
- [ ] Spot instances para workloads tolerantes a interrupção
- [ ] Auto-scaling configurado com políticas adequadas
- [ ] Reserved instances / Savings Plans para workloads previsíveis
- [ ] Monitoramento de custo com alertas de orçamento
- [ ] Infracost integrado no CI (custo visível antes de aplicar)
- [ ] Tags de custo em todos os recursos (time, projeto, ambiente)
- [ ] Recursos não utilizados limpos regularmente

---

> **Referências:** [12-Factor App](https://12factor.net/pt_br/) · [Google SRE Book](https://sre.google/books/) · [CNCF Landscape](https://landscape.cncf.io/) · [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks) · [OWASP](https://owasp.org/) · [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)
