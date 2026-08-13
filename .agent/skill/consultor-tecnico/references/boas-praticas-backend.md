# Boas Práticas — Backend

> Guia de referência técnica para construção de backends robustos, seguros e escaláveis.
> Última atualização: Junho/2026

---

## Sumário

- [Arquitetura & Código](#arquitetura--código)
- [API Design](#api-design)
- [Banco de Dados](#banco-de-dados)
- [Segurança no Backend](#segurança-no-backend)
- [Testes no Backend](#testes-no-backend)
- [Padrões de Projeto Comuns](#padrões-de-projeto-comuns)
- [Checklist de Revisão Backend](#checklist-de-revisão-backend)

---

## Arquitetura & Código

### Separação de Responsabilidades

A base de qualquer backend bem estruturado é a separação clara de camadas. Cada camada tem uma responsabilidade única e bem definida:

| Camada | Responsabilidade | O que NÃO deve fazer |
|---|---|---|
| **Controller** | Receber requisição HTTP, validar entrada, delegar ao service, retornar resposta | Conter lógica de negócio, acessar banco diretamente |
| **Service** | Orquestrar lógica de negócio, coordenar repositórios | Conhecer HTTP (request/response), fazer queries SQL diretas |
| **Repository** | Acessar e persistir dados no banco | Conter lógica de negócio, conhecer detalhes de transporte |
| **Domain/Model** | Representar entidades, value objects e regras de domínio | Depender de frameworks, acessar infraestrutura |

**Exemplo prático em Python (FastAPI):**

```python
# ❌ ERRADO — tudo misturado no controller
@router.post("/users")
async def create_user(request: Request):
    data = await request.json()
    if not data.get("email"):
        return JSONResponse(status_code=400, content={"error": "Email obrigatório"})
    user = await db.execute("INSERT INTO users (email, name) VALUES ($1, $2)", data["email"], data["name"])
    send_email(data["email"], "Bem-vindo!")
    return JSONResponse(status_code=201, content=user)

# ✅ CORRETO — responsabilidades separadas
# controller
@router.post("/users", status_code=201, response_model=UserResponse)
async def create_user(payload: CreateUserRequest, service: UserService = Depends()):
    return await service.create(payload)

# service
class UserService:
    def __init__(self, repo: UserRepository, notifier: EmailNotifier):
        self.repo = repo
        self.notifier = notifier

    async def create(self, payload: CreateUserRequest) -> UserResponse:
        user = User(email=payload.email, name=payload.name)
        saved = await self.repo.save(user)
        await self.notifier.send_welcome(saved.email)
        return UserResponse.from_entity(saved)

# repository
class UserRepository:
    async def save(self, user: User) -> User:
        row = await self.db.execute(
            "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
            user.email, user.name
        )
        return User.from_row(row)
```

### Clean Architecture / Hexagonal

Use quando o projeto tiver **complexidade de domínio significativa** ou quando precisar trocar infraestrutura (ex: mudar de PostgreSQL para MongoDB, trocar provedor de email).

```
src/
├── domain/               # Entidades, value objects, interfaces (ports)
│   ├── entities/
│   │   └── user.py
│   ├── value_objects/
│   │   └── email.py
│   └── ports/
│       ├── user_repository.py    # Interface (abstrata)
│       └── email_sender.py       # Interface (abstrata)
├── application/          # Casos de uso (orquestração)
│   ├── use_cases/
│   │   ├── create_user.py
│   │   └── deactivate_user.py
│   └── dtos/
│       └── user_dto.py
├── infrastructure/       # Implementações concretas (adapters)
│   ├── persistence/
│   │   ├── postgres_user_repository.py
│   │   └── redis_cache.py
│   ├── external/
│   │   └── sendgrid_email_sender.py
│   └── config/
│       └── database.py
└── presentation/         # Controllers, serializers
    ├── api/
    │   └── v1/
    │       └── user_controller.py
    └── schemas/
        └── user_schema.py
```

**Regra de dependência:** as camadas internas (domain, application) **nunca** importam das camadas externas (infrastructure, presentation). A inversão de dependência é feita via interfaces/ports.

> [!TIP]
> Nem todo projeto precisa de Clean Architecture. Para CRUDs simples ou microsserviços pequenos, uma estrutura em 3 camadas (Controller → Service → Repository) é suficiente e mais produtiva.

### Injeção de Dependências

Nunca instancie dependências diretamente dentro de classes de negócio. Use injeção para facilitar testes e troca de implementações.

| Framework | Mecanismo de DI |
|---|---|
| **FastAPI** (Python) | `Depends()` nativo |
| **Spring Boot** (Java) | `@Autowired`, `@Inject`, constructor injection |
| **NestJS** (Node.js) | `@Injectable()`, módulos com providers |
| **ASP.NET Core** (C#) | `IServiceCollection`, constructor injection |
| **Go** | Wire, Fx, ou injeção manual via construtor |

```python
# Python — FastAPI com Depends
from fastapi import Depends

def get_user_repository() -> UserRepository:
    return PostgresUserRepository(get_db_session())

def get_user_service(repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repo)

@router.get("/users/{user_id}")
async def get_user(user_id: int, service: UserService = Depends(get_user_service)):
    return await service.get_by_id(user_id)
```

```java
// Java — Spring Boot (preferir constructor injection)
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailSender emailSender;

    // Spring injeta automaticamente pelo construtor
    public UserService(UserRepository userRepository, EmailSender emailSender) {
        this.userRepository = userRepository;
        this.emailSender = emailSender;
    }
}
```

### Tratamento de Erros Consistente

**Princípios fundamentais:**

1. **Nunca exponha stack traces em produção** — eles revelam detalhes internos da aplicação
2. **Use exceções de domínio tipadas** — crie hierarquias de exceção que façam sentido pro negócio
3. **Centralize o tratamento** — use middleware/exception handlers globais
4. **Retorne respostas padronizadas** — o formato de erro deve ser previsível

```python
# Exceções de domínio
class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} não encontrado: {identifier}",
            code="RESOURCE_NOT_FOUND",
            status_code=404
        )

class BusinessRuleError(AppError):
    def __init__(self, message: str, code: str):
        super().__init__(message=message, code=code, status_code=422)

class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, code="CONFLICT", status_code=409)

# Handler global (FastAPI)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url),
                "request_id": request.state.request_id,
            }
        }
    )

# Handler para erros inesperados — NUNCA exponha o traceback
@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.error("Erro não tratado", exc_info=exc, extra={"request_id": request.state.request_id})
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Ocorreu um erro interno. Tente novamente mais tarde.",
                "request_id": request.state.request_id,
            }
        }
    )
```

**Formato padrão de resposta de erro (RFC 7807 — Problem Details):**

```json
{
  "type": "https://api.exemplo.com/errors/resource-not-found",
  "title": "Recurso não encontrado",
  "status": 404,
  "detail": "O usuário com ID 42 não foi encontrado.",
  "instance": "/api/v1/users/42",
  "request_id": "req-abc123",
  "timestamp": "2026-06-05T14:30:00Z"
}
```

### Logging Estruturado

Logs em texto livre são difíceis de pesquisar e agregar. Prefira **logs em formato JSON** com campos padronizados.

```python
import structlog

# Configuração do structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()

# Uso com contexto rico
logger.info(
    "pedido_criado",
    order_id="ORD-12345",
    user_id=42,
    total=199.90,
    items_count=3,
    payment_method="pix"
)
```

**Saída JSON:**

```json
{
  "event": "pedido_criado",
  "level": "info",
  "timestamp": "2026-06-05T14:30:00Z",
  "order_id": "ORD-12345",
  "user_id": 42,
  "total": 199.90,
  "items_count": 3,
  "payment_method": "pix",
  "request_id": "req-abc123",
  "service": "order-service"
}
```

**Correlation IDs** — propague um ID único por toda a cadeia de chamadas:

```python
# Middleware para gerar/propagar correlation ID
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=correlation_id,
        method=request.method,
        path=str(request.url.path),
    )
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response
```

| Campo Obrigatório | Descrição |
|---|---|
| `timestamp` | Quando o evento ocorreu (ISO 8601, UTC) |
| `level` | Nível do log (debug, info, warning, error, critical) |
| `event` / `message` | Descrição do evento (snake_case, sem espaços) |
| `service` | Nome do serviço que gerou o log |
| `request_id` | ID de correlação da requisição |
| `environment` | Ambiente (dev, staging, production) |

### Observabilidade: Métricas, Logs, Traces

Os **três pilares da observabilidade** devem estar integrados:

```
┌──────────────────────────────────────────────────────┐
│                  OBSERVABILIDADE                     │
│                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐     │
│  │  Logs    │   │ Métricas │   │   Traces     │     │
│  │ (O quê) │   │ (Quanto) │   │ (Onde/Quando)│     │
│  └──────────┘   └──────────┘   └──────────────┘     │
│                                                      │
│  structlog      Prometheus     OpenTelemetry/Jaeger  │
│  ELK Stack      Grafana        Zipkin                │
│  Loki           Datadog        Tempo                 │
└──────────────────────────────────────────────────────┘
```

**OpenTelemetry — instrumentação automática e manual:**

```python
# Instrumentação com OpenTelemetry (Python)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Setup
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317")))
trace.set_tracer_provider(provider)

# Instrumentação automática
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)

# Instrumentação manual para lógica de negócio
tracer = trace.get_tracer(__name__)

async def process_payment(order_id: str, amount: float):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("payment.amount", amount)
        try:
            result = await gateway.charge(amount)
            span.set_attribute("payment.status", "success")
            return result
        except PaymentError as e:
            span.set_attribute("payment.status", "failed")
            span.record_exception(e)
            raise
```

**Métricas essenciais (RED Method):**

| Métrica | O que mede | Exemplo Prometheus |
|---|---|---|
| **Rate** | Requisições por segundo | `http_requests_total` |
| **Errors** | Taxa de erros | `http_requests_total{status="5xx"}` |
| **Duration** | Latência (p50, p95, p99) | `http_request_duration_seconds` |

### Idempotência em Operações Críticas

Operações que podem ser repetidas (retries, falhas de rede) devem produzir o mesmo resultado. Isso é **essencial** em pagamentos, envio de emails e criação de recursos.

```python
# Implementação com chave de idempotência
@router.post("/payments")
async def create_payment(
    payload: PaymentRequest,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    service: PaymentService = Depends()
):
    # Verifica se já processou essa chave
    existing = await service.find_by_idempotency_key(idempotency_key)
    if existing:
        return existing  # Retorna o resultado anterior

    result = await service.process(payload, idempotency_key)
    return result

# No banco — tabela de idempotência
# CREATE TABLE idempotency_keys (
#     key VARCHAR(255) PRIMARY KEY,
#     response JSONB NOT NULL,
#     status VARCHAR(20) NOT NULL,  -- 'processing', 'completed', 'failed'
#     created_at TIMESTAMPTZ DEFAULT NOW(),
#     expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
# );
```

**Estratégias por tipo de operação:**

| Operação | Estratégia de Idempotência |
|---|---|
| Criar recurso | Idempotency Key no header |
| Atualizar recurso | PUT com estado completo (naturalmente idempotente) |
| Deletar recurso | DELETE retorna 204 mesmo se já deletado |
| Pagamento | Idempotency Key + verificação de status no gateway |
| Enviar email | Deduplicação por hash (destinatário + template + dados) |

### Padrões de Pastas e Organização

**Organização por Feature (recomendada para projetos médios/grandes):**

```
src/
├── common/                   # Código compartilhado
│   ├── middleware/
│   ├── exceptions/
│   ├── utils/
│   └── database/
├── modules/
│   ├── users/
│   │   ├── __init__.py
│   │   ├── controller.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   ├── models.py
│   │   ├── schemas.py        # DTOs / validação de entrada
│   │   ├── exceptions.py
│   │   └── tests/
│   │       ├── test_service.py
│   │       └── test_controller.py
│   ├── orders/
│   │   ├── ...
│   └── payments/
│       ├── ...
├── config/
│   ├── settings.py
│   ├── logging.py
│   └── database.py
├── main.py
└── tests/
    ├── integration/
    ├── e2e/
    └── conftest.py
```

**Organização por Camada (OK para projetos pequenos):**

```
src/
├── controllers/
├── services/
├── repositories/
├── models/
├── schemas/
├── middleware/
├── config/
└── tests/
```

> [!IMPORTANT]
> Escolha **uma** convenção e mantenha-a consistente em todo o projeto. Misturar organização por feature e por camada no mesmo nível gera confusão e aumenta o acoplamento.

---

## API Design

### RESTful: Convenções de Nomes, Verbos HTTP e Status Codes

**Convenções de nomenclatura de URLs:**

| Regra | ✅ Correto | ❌ Errado |
|---|---|---|
| Substantivos no plural | `/users` | `/user`, `/getUsers` |
| Kebab-case | `/order-items` | `/orderItems`, `/order_items` |
| Sem verbos na URL | `POST /users` | `/createUser` |
| Hierarquia com aninhamento | `/users/42/orders` | `/getUserOrders?userId=42` |
| Sem extensão de arquivo | `/users/42` | `/users/42.json` |
| Máximo 3 níveis de aninhamento | `/users/42/orders` | `/users/42/orders/1/items/5/variants` |

**Verbos HTTP e seus significados:**

| Verbo | Uso | Idempotente? | Corpo na Requisição? | Corpo na Resposta? |
|---|---|---|---|---|
| `GET` | Obter recurso(s) | ✅ Sim | ❌ Não | ✅ Sim |
| `POST` | Criar recurso | ❌ Não | ✅ Sim | ✅ Sim |
| `PUT` | Atualizar recurso (completo) | ✅ Sim | ✅ Sim | ✅ Sim |
| `PATCH` | Atualizar recurso (parcial) | ❌ Não* | ✅ Sim | ✅ Sim |
| `DELETE` | Remover recurso | ✅ Sim | ❌ Não | ❌ Opcional |
| `OPTIONS` | Verificar métodos permitidos | ✅ Sim | ❌ Não | ✅ Sim |
| `HEAD` | GET sem corpo (verificar existência) | ✅ Sim | ❌ Não | ❌ Não |

> \*PATCH pode ser idempotente dependendo da implementação.

**Status Codes — use os corretos:**

| Código | Significado | Quando usar |
|---|---|---|
| `200 OK` | Sucesso | GET, PUT, PATCH com corpo |
| `201 Created` | Recurso criado | POST que cria recurso (inclua `Location` header) |
| `204 No Content` | Sucesso sem corpo | DELETE, PUT/PATCH sem corpo de retorno |
| `400 Bad Request` | Erro de validação | Dados inválidos na requisição |
| `401 Unauthorized` | Não autenticado | Token ausente ou inválido |
| `403 Forbidden` | Não autorizado | Autenticado mas sem permissão |
| `404 Not Found` | Recurso não existe | ID não encontrado |
| `409 Conflict` | Conflito de estado | Email já cadastrado, versão desatualizada |
| `422 Unprocessable Entity` | Erro de regra de negócio | Saldo insuficiente, pedido já cancelado |
| `429 Too Many Requests` | Rate limit excedido | Inclua `Retry-After` header |
| `500 Internal Server Error` | Erro interno | Erros não tratados (nunca exponha detalhes) |
| `502 Bad Gateway` | Serviço upstream falhou | Gateway/proxy não conseguiu conectar |
| `503 Service Unavailable` | Serviço indisponível | Manutenção, sobrecarga |

### Versionamento de API

| Estratégia | Exemplo | Prós | Contras |
|---|---|---|---|
| **Path** (mais comum) | `/api/v1/users` | Simples, explícito, fácil de rotear | Polui a URL |
| **Header** | `Accept: application/vnd.api.v2+json` | URL limpa | Menos visível, mais difícil de testar |
| **Query string** | `/users?version=2` | Fácil de adicionar | Pode ser esquecido, caching mais complexo |

**Recomendação:** use **versionamento por path** para APIs públicas e **header** para APIs internas.

```python
# FastAPI — versionamento por path
from fastapi import APIRouter

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: int):
    return {"id": user_id, "name": "João"}  # formato v1

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: int):
    return {"data": {"id": user_id, "full_name": "João Silva", "created_at": "..."}}  # formato v2

app.include_router(v1_router)
app.include_router(v2_router)
```

### Paginação

**Cursor-based (recomendado para feeds e listas grandes):**

```json
// Request
GET /api/v1/orders?limit=20&cursor=eyJpZCI6MTAwfQ==

// Response
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIwfQ==",
    "prev_cursor": "eyJpZCI6ODJ9",
    "has_next": true,
    "has_prev": true,
    "limit": 20
  }
}
```

**Offset-based (mais simples, OK para datasets menores):**

```json
// Request
GET /api/v1/products?page=3&per_page=25

// Response
{
  "data": [...],
  "pagination": {
    "page": 3,
    "per_page": 25,
    "total": 150,
    "total_pages": 6
  }
}
```

**Comparação:**

| Aspecto | Cursor | Offset |
|---|---|---|
| Performance em datasets grandes | ✅ O(1) | ❌ O(n) — piora com offset alto |
| Consistência com inserções/deleções | ✅ Não pula/duplica | ❌ Pode pular ou duplicar |
| "Ir para página X" | ❌ Não suporta | ✅ Suporta |
| Complexidade de implementação | Média | Baixa |
| Melhor para | Feeds, timelines, logs | Tabelas com navegação |

### Filtros e Ordenação

```
# Filtros
GET /api/v1/products?category=electronics&price_min=100&price_max=500&status=active

# Ordenação
GET /api/v1/products?sort=-created_at,name    # "-" = descendente

# Filtros avançados (operadores)
GET /api/v1/products?filter[price][gte]=100&filter[price][lte]=500&filter[name][contains]=notebook

# Seleção de campos (sparse fieldsets)
GET /api/v1/products?fields=id,name,price
```

### HATEOAS

Use quando a API precisar ser **autodescritiva** e o cliente não deva hardcodar URLs:

```json
{
  "data": {
    "id": 42,
    "status": "pending",
    "total": 199.90
  },
  "links": {
    "self": "/api/v1/orders/42",
    "cancel": "/api/v1/orders/42/cancel",
    "payment": "/api/v1/orders/42/payment",
    "items": "/api/v1/orders/42/items"
  },
  "actions": {
    "cancel": { "method": "POST", "href": "/api/v1/orders/42/cancel" },
    "pay": { "method": "POST", "href": "/api/v1/orders/42/payment" }
  }
}
```

> [!TIP]
> HATEOAS é valioso para APIs públicas com muitos consumers diferentes. Para APIs internas entre serviços do mesmo time, o overhead de implementação raramente compensa.

### Rate Limiting e Throttling

Proteja sua API contra abuso e sobrecarga:

```python
# FastAPI com slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")

@app.get("/api/v1/search")
@limiter.limit("30/minute")              # 30 requisições por minuto
async def search(request: Request, q: str):
    ...

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")               # Login: mais restritivo
async def login(request: Request):
    ...

@app.get("/api/v1/products")
@limiter.limit("100/minute;1000/hour")   # Limites compostos
async def list_products(request: Request):
    ...
```

**Headers de rate limiting na resposta:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 67
X-RateLimit-Reset: 1717599000
Retry-After: 30            # Enviado quando 429
```

| Estratégia | Descrição | Uso |
|---|---|---|
| **Fixed Window** | N requests por janela fixa | Simples, mas permite bursts na borda |
| **Sliding Window** | Janela deslizante | Mais justo, evita bursts |
| **Token Bucket** | Tokens recarregados por tempo | Permite bursts controlados |
| **Leaky Bucket** | Fila com vazão constante | Taxa constante de processamento |

### Documentação com OpenAPI/Swagger

```python
# FastAPI gera OpenAPI automaticamente — enriqueça com detalhes
from fastapi import FastAPI, Query, Path

app = FastAPI(
    title="API de Pedidos",
    description="API para gerenciamento de pedidos do e-commerce",
    version="1.0.0",
    contact={"name": "Time Backend", "email": "backend@empresa.com"},
    servers=[
        {"url": "https://api.empresa.com", "description": "Produção"},
        {"url": "https://api-staging.empresa.com", "description": "Staging"},
    ]
)

@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Buscar pedido por ID",
    description="Retorna os detalhes completos de um pedido, incluindo itens e status de pagamento.",
    responses={
        404: {"description": "Pedido não encontrado", "model": ErrorResponse},
        403: {"description": "Sem permissão para acessar este pedido"},
    },
    tags=["Pedidos"],
)
async def get_order(
    order_id: int = Path(..., description="ID único do pedido", ge=1, example=42),
):
    ...
```

> [!IMPORTANT]
> A documentação OpenAPI **deve ser a fonte da verdade** da sua API. Mantenha-a sempre atualizada e considere usar ferramentas como **Spectral** para lint automático do spec.

### GraphQL: Quando Usar e Trade-offs vs REST

| Aspecto | REST | GraphQL |
|---|---|---|
| **Melhor para** | CRUD simples, APIs públicas | Dados relacionais complexos, mobile |
| **Over-fetching** | ❌ Comum (retorna campos não usados) | ✅ Cliente pede só o que precisa |
| **Under-fetching** | ❌ Múltiplas chamadas para montar tela | ✅ Uma query traz tudo |
| **Caching** | ✅ HTTP caching nativo (CDN, ETag) | ❌ Requer caching custom (Apollo, Relay) |
| **Upload de arquivos** | ✅ Nativo (multipart) | ❌ Requer spec separado (multipart request) |
| **Complexidade** | Baixa | Média-alta (resolvers, dataloaders, N+1) |
| **Rate limiting** | ✅ Fácil (por endpoint) | ❌ Difícil (query depth, complexity analysis) |
| **Versionamento** | Necessário (v1, v2) | Não necessário (deprecate fields) |
| **Real-time** | Webhooks, SSE | Subscriptions nativo |

**Use GraphQL quando:**
- O frontend precisa de **flexibilidade** nos dados retornados
- Há **múltiplos consumers** (web, mobile, TV) com necessidades diferentes
- Os dados são **altamente relacionais** e interconectados
- Quer evitar **múltiplas chamadas** para compor uma tela

**Evite GraphQL quando:**
- A API é **CRUD simples** sem relações complexas
- Precisa de **caching HTTP agressivo** (CDN)
- A equipe é **pequena** e não tem experiência com GraphQL
- A API é **pública** e precisa de controle fino de rate limiting

---

## Banco de Dados

### Modelagem: Normalização vs Denormalização

| Aspecto | Normalização | Denormalização |
|---|---|---|
| **Objetivo** | Eliminar redundância | Otimizar leitura |
| **Integridade** | ✅ Alta | ❌ Risco de inconsistência |
| **Leituras** | ❌ Mais JOINs | ✅ Menos JOINs, mais rápido |
| **Escritas** | ✅ Atualiza em um lugar | ❌ Atualiza em vários lugares |
| **Espaço** | ✅ Menor | ❌ Maior (dados duplicados) |
| **Quando usar** | OLTP, dados transacionais | OLAP, relatórios, cache, leitura pesada |

**Regra prática:** comece **normalizado** (3FN) e denormalize quando a **performance de leitura** exigir, baseado em métricas reais — não em suposições.

```sql
-- Normalizado (3FN): integridade garantida
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL
);

-- Denormalizado para relatórios: evita JOINs pesados
CREATE TABLE order_summary (
    order_id INTEGER PRIMARY KEY,
    customer_name VARCHAR(200),
    customer_email VARCHAR(255),
    total_amount NUMERIC(12,2),
    items_count INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMPTZ
);
```

### Índices: Quando Criar e Como Avaliar

**Quando criar índices:**

| Cenário | Tipo de Índice |
|---|---|
| Buscas por igualdade (`WHERE email = ?`) | B-tree (padrão) |
| Buscas por range (`WHERE created_at > ?`) | B-tree |
| Buscas textuais (`WHERE name ILIKE '%term%'`) | GIN com pg_trgm |
| Busca full-text | GIN com tsvector |
| Dados geoespaciais | GiST / SP-GiST |
| Valores JSON (`WHERE data->>'key' = ?`) | GIN |
| Filtros com poucos valores distintos | Partial index |

```sql
-- Índice básico
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Índice composto (ordem importa! coluna mais seletiva primeiro)
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Índice parcial — indexa apenas registros relevantes (menor, mais rápido)
CREATE INDEX idx_orders_pending ON orders(created_at)
    WHERE status = 'pending';

-- Índice covering — atende a query inteiramente pelo índice (index-only scan)
CREATE INDEX idx_products_search ON products(category, price)
    INCLUDE (name, id);

-- Índice para busca textual com trigram
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

**Como avaliar se um índice é necessário:**

```sql
-- Analise o plano de execução
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending';

-- Identifique índices não utilizados
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Identifique queries lentas (pg_stat_statements)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

> [!WARNING]
> Cada índice adicional **reduz a performance de escrita** (INSERT, UPDATE, DELETE) e **ocupa espaço em disco**. Não crie índices "preventivamente" — crie baseado em queries reais e meça o impacto.

### Migrations Versionadas

Toda alteração de schema deve ser rastreável, versionável e reversível:

| Ferramenta | Linguagem | Comando |
|---|---|---|
| **Alembic** | Python | `alembic upgrade head`, `alembic downgrade -1` |
| **Flyway** | Java / Multi | `flyway migrate`, `flyway info` |
| **Prisma Migrate** | Node.js | `npx prisma migrate dev`, `npx prisma migrate deploy` |
| **Knex** | Node.js | `npx knex migrate:latest`, `npx knex migrate:rollback` |
| **golang-migrate** | Go | `migrate -path ./migrations up`, `migrate down 1` |
| **Django** | Python | `python manage.py makemigrations`, `python manage.py migrate` |
| **EF Core** | C# | `dotnet ef migrations add`, `dotnet ef database update` |

**Boas práticas de migrations:**

```python
# Alembic — migration bem escrita
"""
Adiciona tabela de auditoria de pedidos

Revision ID: a1b2c3d4e5f6
Revises: 9z8y7x6w5v4u
Create Date: 2026-06-05 14:30:00
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "order_audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("old_status", sa.String(20)),
        sa.Column("new_status", sa.String(20)),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
    )
    op.create_index("idx_audit_order_id", "order_audit_log", ["order_id"])
    op.create_index("idx_audit_changed_at", "order_audit_log", ["changed_at"])

def downgrade():
    op.drop_index("idx_audit_changed_at")
    op.drop_index("idx_audit_order_id")
    op.drop_table("order_audit_log")
```

**Regras:**
1. **Sempre** escreva `downgrade()` — poder reverter é essencial
2. **Nunca** edite uma migration já aplicada em produção — crie uma nova
3. **Teste** migrations em staging antes de produção
4. **Separe** migrations de schema (DDL) de migrations de dados (DML)
5. **Nomeie** migrations descritivamente: `add_user_email_verified_column`, não `migration_042`

### Connection Pooling

Conexões de banco são **caras** para criar e destruir. Use pools.

```python
# SQLAlchemy — configuração de pool
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg2://user:pass@localhost:5432/mydb",
    pool_size=20,           # Conexões permanentes no pool
    max_overflow=10,        # Conexões extras além do pool_size
    pool_timeout=30,        # Segundos para esperar por conexão disponível
    pool_recycle=1800,      # Recicla conexões a cada 30 minutos
    pool_pre_ping=True,     # Verifica se a conexão está viva antes de usar
    echo=False,             # Não logue queries em produção
)
```

**Dimensionamento do pool:**

```
pool_size = (num_cores * 2) + num_discos_efetivos

Exemplo:
- Servidor com 4 cores, 1 SSD: (4 * 2) + 1 = 9 conexões
- Múltiplas instâncias: dividir pelo número de instâncias
- 3 instâncias, pool ideal 9: pool_size = 3 por instância
```

| Ferramenta de Pool Externo | Uso |
|---|---|
| **PgBouncer** | Proxy de pool para PostgreSQL (recomendado em produção) |
| **ProxySQL** | Proxy de pool para MySQL |
| **Odyssey** | Alternativa ao PgBouncer com threading |

### Query Optimization

```sql
-- ❌ RUIM: SELECT * traz colunas desnecessárias
SELECT * FROM orders WHERE customer_id = 42;

-- ✅ BOM: selecione apenas o necessário
SELECT id, status, total, created_at FROM orders WHERE customer_id = 42;

-- ❌ RUIM: LIKE com wildcard no início não usa índice
SELECT * FROM products WHERE name LIKE '%notebook%';

-- ✅ BOM: use busca full-text ou trigram
SELECT * FROM products WHERE name_tsvector @@ to_tsquery('notebook');

-- ❌ RUIM: função na coluna invalida índice
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2026;

-- ✅ BOM: range query usa índice
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';

-- ❌ RUIM: NOT IN com subquery pode ser muito lento
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM banned_users);

-- ✅ BOM: LEFT JOIN + IS NULL ou NOT EXISTS
SELECT u.* FROM users u
LEFT JOIN banned_users b ON u.id = b.user_id
WHERE b.user_id IS NULL;

-- Ou:
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id);
```

### N+1 Queries: Como Detectar e Resolver

O problema N+1 é a **causa mais comum de lentidão** em aplicações com ORM:

```python
# ❌ N+1 PROBLEM — 1 query para pedidos + N queries para itens
orders = session.query(Order).filter_by(customer_id=42).all()  # 1 query
for order in orders:
    print(order.items)  # N queries (uma por pedido!)

# ✅ SOLUÇÃO 1: Eager loading (JOIN)
from sqlalchemy.orm import joinedload
orders = session.query(Order)\
    .options(joinedload(Order.items))\
    .filter_by(customer_id=42)\
    .all()  # 1 query com JOIN

# ✅ SOLUÇÃO 2: Subquery loading
from sqlalchemy.orm import subqueryload
orders = session.query(Order)\
    .options(subqueryload(Order.items))\
    .filter_by(customer_id=42)\
    .all()  # 2 queries (uma para orders, uma para todos os items)

# ✅ SOLUÇÃO 3: Select IN loading (melhor para grandes conjuntos)
from sqlalchemy.orm import selectinload
orders = session.query(Order)\
    .options(selectinload(Order.items))\
    .filter_by(customer_id=42)\
    .all()  # 2 queries (SELECT ... WHERE order_id IN (...))
```

**Como detectar N+1:**

| Ferramenta | Linguagem | Descrição |
|---|---|---|
| **django-debug-toolbar** | Python/Django | Painel visual com contagem de queries |
| **nplusone** | Python | Detecta N+1 automaticamente e lança warning |
| **sqlalchemy echo=True** | Python | Loga todas as queries |
| **Hibernate Statistics** | Java | `hibernate.generate_statistics=true` |
| **Bullet gem** | Ruby | Detecta N+1 e eager loading desnecessário |
| **Laravel Debugbar** | PHP | Painel com queries e N+1 warnings |

### Transações: Quando Usar e Isolation Levels

**Quando usar transações explícitas:**

- Operações que envolvem **múltiplas tabelas** que devem ser consistentes
- **Transferências financeiras** (débito + crédito)
- Operações de **leitura-modifica-escrita** (read-modify-write)
- Qualquer cenário onde **falha parcial** é inaceitável

```python
# Python — transação com SQLAlchemy
from sqlalchemy.orm import Session

async def transfer_funds(
    session: Session,
    from_account_id: int,
    to_account_id: int,
    amount: Decimal
):
    with session.begin():  # Abre transação, commit automático no fim
        from_account = session.query(Account).with_for_update().get(from_account_id)
        to_account = session.query(Account).with_for_update().get(to_account_id)

        if from_account.balance < amount:
            raise BusinessRuleError("Saldo insuficiente", "INSUFFICIENT_BALANCE")

        from_account.balance -= amount
        to_account.balance += amount

        session.add(AuditLog(action="transfer", amount=amount, ...))
    # Commit automático aqui; rollback automático em caso de exceção
```

**Isolation Levels:**

| Nível | Dirty Read | Non-Repeatable Read | Phantom Read | Performance | Uso |
|---|---|---|---|---|---|
| `READ UNCOMMITTED` | ✅ Possível | ✅ Possível | ✅ Possível | ⚡ Mais rápido | Quase nunca |
| `READ COMMITTED` (padrão PG) | ❌ Não | ✅ Possível | ✅ Possível | ⚡ Rápido | Maioria dos casos |
| `REPEATABLE READ` | ❌ Não | ❌ Não | ✅ Possível* | 🔄 Médio | Relatórios, cálculos |
| `SERIALIZABLE` | ❌ Não | ❌ Não | ❌ Não | 🐢 Mais lento | Transações financeiras |

> \*No PostgreSQL, `REPEATABLE READ` também previne phantom reads (implementação via MVCC).

```sql
-- Definir isolation level por transação
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- operações críticas aqui
COMMIT;

-- Definir isolation level por sessão
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

---

## Segurança no Backend

### Validação de TODA Entrada

**Nunca confie em dados vindos do cliente.** Valide no controller antes de processar.

```python
# Python — Pydantic para validação rigorosa
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import date
import re

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nome completo")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    birth_date: date
    cpf: str = Field(..., pattern=r"^\d{11}$")

    @validator("password")
    def password_strength(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Senha deve conter ao menos uma letra maiúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("Senha deve conter ao menos uma letra minúscula")
        if not re.search(r"\d", v):
            raise ValueError("Senha deve conter ao menos um número")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Senha deve conter ao menos um caractere especial")
        return v

    @validator("birth_date")
    def must_be_adult(cls, v):
        from dateutil.relativedelta import relativedelta
        if v > date.today() - relativedelta(years=18):
            raise ValueError("Usuário deve ter ao menos 18 anos")
        return v

    @validator("name")
    def sanitize_name(cls, v):
        # Remove tags HTML/scripts
        import bleach
        return bleach.clean(v, tags=[], strip=True).strip()
```

**Tipos de validação a aplicar:**

| Tipo | Exemplos |
|---|---|
| **Tipo de dado** | String, integer, boolean, date |
| **Tamanho/Comprimento** | `min_length=2, max_length=100` |
| **Formato** | Email, CPF, telefone, UUID |
| **Range** | `ge=0, le=999999` (valores numéricos) |
| **Whitelist** | Enum de valores permitidos |
| **Sanitização** | Remover HTML, normalizar unicode |
| **Negócio** | Idade mínima, saldo suficiente |

### Autenticação: OAuth 2.0 e JWT com Rotação

**Fluxo recomendado:**

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│ Cliente │────▶│ Auth Server │────▶│    API     │────▶│  Banco   │
│         │◀────│  (Keycloak) │◀────│  Backend   │◀────│  de Dados│
└────────┘     └────────────┘     └────────────┘     └──────────┘
    │                │
    │ 1. Login       │ 2. Valida credenciais
    │ (email/senha)  │ 3. Emite access_token + refresh_token
    │                │
    │ 4. Usa access_token em Authorization header
    │ 5. Quando expira, usa refresh_token para renovar
```

**Configuração de JWT segura:**

```python
# NÃO armazene dados sensíveis no payload!
import jwt
from datetime import datetime, timedelta

# Geração de tokens
def create_tokens(user_id: int, roles: list[str]) -> dict:
    now = datetime.utcnow()

    access_payload = {
        "sub": str(user_id),
        "roles": roles,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=15),    # Curta duração!
        "jti": str(uuid.uuid4()),               # ID único para revogação
    }

    refresh_payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=7),         # Mais longa, mas com rotação
        "jti": str(uuid.uuid4()),
        "family": str(uuid.uuid4()),            # Família para detectar roubo
    }

    return {
        "access_token": jwt.encode(access_payload, ACCESS_SECRET, algorithm="RS256"),
        "refresh_token": jwt.encode(refresh_payload, REFRESH_SECRET, algorithm="RS256"),
        "expires_in": 900,
        "token_type": "Bearer",
    }

# Rotação de refresh token
async def rotate_refresh_token(old_refresh_token: str) -> dict:
    payload = jwt.decode(old_refresh_token, REFRESH_SECRET, algorithms=["RS256"])
    family = payload["family"]

    # Verifica se o token já foi usado (detecta roubo)
    if await redis.sismember(f"used_tokens:{family}", payload["jti"]):
        # Token reutilizado! Revogar toda a família
        await redis.delete(f"refresh_family:{family}")
        raise SecurityError("Refresh token reuse detected — all sessions revoked")

    # Marca como usado
    await redis.sadd(f"used_tokens:{family}", payload["jti"])

    # Emite novo par de tokens (mesma família)
    return create_tokens(int(payload["sub"]), roles, family=family)
```

| Parâmetro | Valor Recomendado | Justificativa |
|---|---|---|
| Algoritmo | `RS256` (assimétrico) | Permite verificação sem chave privada |
| Duração access_token | 15 minutos | Minimiza janela de ataque |
| Duração refresh_token | 7 dias | Conveniência com rotação |
| Armazenamento (browser) | HttpOnly cookie (refresh), memória (access) | Protege contra XSS |
| Revogação | Blocklist em Redis por `jti` | Permite logout imediato |

### Autorização: RBAC vs ABAC

**RBAC (Role-Based Access Control):**

```python
# Simples e efetivo para a maioria dos casos
from functools import wraps

def require_roles(*allowed_roles):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if not any(role in current_user.roles for role in allowed_roles):
                raise ForbiddenError("Permissão insuficiente")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

@router.delete("/users/{user_id}")
@require_roles("admin", "super_admin")
async def delete_user(user_id: int, current_user: User = Depends()):
    ...

@router.get("/reports/financial")
@require_roles("admin", "finance")
async def financial_report(current_user: User = Depends()):
    ...
```

**ABAC (Attribute-Based Access Control):**

```python
# Mais flexível — avalia atributos do usuário, recurso e contexto
class Policy:
    def __init__(self, conditions: list[Callable]):
        self.conditions = conditions

    def evaluate(self, user: User, resource: Any, context: dict) -> bool:
        return all(cond(user, resource, context) for cond in self.conditions)

# Políticas compostas
edit_order_policy = Policy([
    lambda u, r, c: r.customer_id == u.id or "admin" in u.roles,  # Dono ou admin
    lambda u, r, c: r.status in ("pending", "processing"),         # Apenas editáveis
    lambda u, r, c: c.get("ip_country") == u.country,             # Mesmo país
    lambda u, r, c: 8 <= c.get("hour", 12) <= 22,                 # Horário comercial
])
```

| Aspecto | RBAC | ABAC |
|---|---|---|
| **Complexidade** | Baixa | Alta |
| **Flexibilidade** | Limitada | Muito alta |
| **Performance** | ⚡ Rápido | 🔄 Depende das policies |
| **Auditoria** | Simples | Mais complexa |
| **Melhor para** | Maioria dos projetos | Regras contextuais complexas |

### OWASP Top 10 — Proteções

| Vulnerabilidade | Proteção | Implementação |
|---|---|---|
| **A01: Broken Access Control** | Autorização em cada endpoint | RBAC/ABAC + testes de autorização |
| **A02: Cryptographic Failures** | TLS 1.3, hashing seguro | Certificados válidos, bcrypt/argon2 |
| **A03: Injection** | Prepared statements, ORMs | `query("SELECT ... WHERE id=$1", id)` |
| **A04: Insecure Design** | Threat modeling, security reviews | STRIDE, diagramas de ameaça |
| **A05: Security Misconfiguration** | Hardening, defaults seguros | Headers de segurança, portas fechadas |
| **A06: Vulnerable Components** | Dependências atualizadas | Dependabot, Snyk, `npm audit` |
| **A07: Auth Failures** | MFA, rate limit em login | Lockout após 5 tentativas, CAPTCHA |
| **A08: Data Integrity Failures** | Assinatura de dados, CI/CD seguro | Checksums, pipeline protegido |
| **A09: Logging Failures** | Logging de eventos de segurança | Audit logs, SIEM integrado |
| **A10: SSRF** | Whitelist de URLs, validação | Bloquear IPs internos, usar allow-list |

### SQL Injection: Prepared Statements

```python
# ❌ VULNERÁVEL — concatenação de string
query = f"SELECT * FROM users WHERE email = '{email}'"
cursor.execute(query)

# ❌ VULNERÁVEL — f-string
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ SEGURO — parâmetros posicionais
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# ✅ SEGURO — parâmetros nomeados
cursor.execute("SELECT * FROM users WHERE email = :email", {"email": email})

# ✅ SEGURO — ORM (SQLAlchemy)
user = session.query(User).filter(User.email == email).first()

# ✅ SEGURO — ORM (Django)
user = User.objects.filter(email=email).first()
```

> [!CAUTION]
> **Mesmo com ORM**, tome cuidado com `.raw()`, `.extra()` e `text()` — essas funções permitem SQL cru e devem sempre usar parâmetros. Nunca construa queries concatenando strings de entrada do usuário.

### Criptografia

**Em trânsito:**

```nginx
# Nginx — TLS 1.3 configuração
server {
    listen 443 ssl http2;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # HSTS — força HTTPS por 1 ano
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

**Em repouso:**

```python
# Criptografia de campos sensíveis (AES-256-GCM)
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# Opção 1: Fernet (mais simples, AES-128-CBC + HMAC-SHA256)
key = Fernet.generate_key()  # Armazene em vault (AWS KMS, HashiCorp Vault)
cipher = Fernet(key)

encrypted_cpf = cipher.encrypt(b"12345678901")
decrypted_cpf = cipher.decrypt(encrypted_cpf)

# Opção 2: AES-256-GCM (mais controle)
key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
encrypted = aesgcm.encrypt(nonce, plaintext, associated_data=None)
```

### Hashing de Senhas

```python
# ✅ bcrypt (amplamente suportado)
import bcrypt

hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))
is_valid = bcrypt.checkpw(password.encode("utf-8"), hashed)

# ✅ Argon2 (recomendado, vencedor do PHC — Password Hashing Competition)
from argon2 import PasswordHasher

ph = PasswordHasher(
    time_cost=3,        # Iterações
    memory_cost=65536,  # 64 MB de memória
    parallelism=4,      # Threads paralelas
)
hashed = ph.hash(password)
is_valid = ph.verify(hashed, password)
```

| Algoritmo | Status | Observação |
|---|---|---|
| `argon2id` | ✅ Recomendado | Resistente a GPU e side-channel |
| `bcrypt` | ✅ Aceitável | Amplamente suportado, battle-tested |
| `scrypt` | ✅ Aceitável | Memória-intensivo |
| `PBKDF2` | ⚠️ Legado | Usar apenas se exigido por compliance |
| `SHA-256` / `MD5` | ❌ Inseguro | **Nunca** use para senhas |

### Headers de Segurança

```python
# Middleware de headers de segurança (FastAPI)
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"  # Desativado (CSP é melhor)
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store"  # Para respostas sensíveis

    # Remover headers que expõem informações do servidor
    response.headers.pop("Server", None)
    response.headers.pop("X-Powered-By", None)

    return response
```

| Header | Valor | Proteção |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Força HTTPS |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `X-Frame-Options` | `DENY` | Previne clickjacking |
| `Content-Security-Policy` | `default-src 'self'` | Previne XSS, injeção de scripts |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla vazamento de URL |
| `Permissions-Policy` | `camera=(), microphone=()` | Desabilita APIs do navegador |

### CORS Restritivo

```python
# ❌ ERRADO — aberto para todo mundo
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ✅ CORRETO — restritivo e específico
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "https://app.empresa.com",
    "https://admin.empresa.com",
]

if settings.ENVIRONMENT == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
    expose_headers=["X-Correlation-ID", "X-RateLimit-Remaining"],
    max_age=600,  # Cache preflight por 10 minutos
)
```

### Audit Logs

Registre toda ação significativa para compliance e investigação de incidentes:

```python
# Modelo de audit log
class AuditLog:
    id: int
    timestamp: datetime          # Quando aconteceu
    actor_id: int                # Quem fez
    actor_type: str              # "user", "system", "api_key"
    action: str                  # "user.created", "order.cancelled", "permission.granted"
    resource_type: str           # "user", "order", "product"
    resource_id: str             # ID do recurso afetado
    changes: dict                # {"status": {"old": "active", "new": "suspended"}}
    ip_address: str              # IP do ator
    user_agent: str              # User-Agent do cliente
    request_id: str              # Correlation ID
    metadata: dict               # Dados extras relevantes

# Exemplo de uso
async def suspend_user(user_id: int, reason: str, actor: User):
    user = await repo.get(user_id)
    old_status = user.status
    user.status = "suspended"
    await repo.save(user)

    await audit_service.log(
        actor_id=actor.id,
        action="user.suspended",
        resource_type="user",
        resource_id=str(user_id),
        changes={"status": {"old": old_status, "new": "suspended"}},
        metadata={"reason": reason},
    )
```

**Eventos que devem gerar audit logs:**

- Login / logout / falha de login
- Criação, modificação e exclusão de recursos
- Alterações de permissões e roles
- Acesso a dados sensíveis (PII)
- Operações financeiras
- Alterações de configuração do sistema
- Exportação de dados em massa

### Mass Assignment Protection

```python
# ❌ VULNERÁVEL — aceita qualquer campo do JSON
@router.put("/users/{user_id}")
async def update_user(user_id: int, request: Request):
    data = await request.json()
    user = await repo.get(user_id)
    for key, value in data.items():
        setattr(user, key, value)  # Atacante pode enviar {"role": "admin", "is_verified": true}
    await repo.save(user)

# ✅ SEGURO — schema explícito define campos permitidos
class UpdateUserRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    # role, is_admin, is_verified NÃO estão aqui

    class Config:
        extra = "forbid"  # Rejeita campos não declarados

@router.put("/users/{user_id}")
async def update_user(user_id: int, payload: UpdateUserRequest):
    user = await repo.get(user_id)
    update_data = payload.dict(exclude_unset=True)  # Apenas campos enviados
    for key, value in update_data.items():
        setattr(user, key, value)
    await repo.save(user)
```

### Circuit Breaker e Timeout

Proteja seu serviço contra falhas em cascata:

```python
# Circuit Breaker com pybreaker
import pybreaker

# Configura circuit breaker para serviço de pagamento
payment_breaker = pybreaker.CircuitBreaker(
    fail_max=5,                    # Abre após 5 falhas
    reset_timeout=30,              # Tenta fechar após 30 segundos
    exclude=[ValidationError],     # Não conta erros de validação
)

@payment_breaker
async def process_payment(amount: float) -> PaymentResult:
    async with httpx.AsyncClient(timeout=5.0) as client:  # Timeout de 5s
        response = await client.post(
            "https://gateway.pagamento.com/charge",
            json={"amount": amount},
            timeout=httpx.Timeout(
                connect=2.0,       # Timeout de conexão
                read=5.0,          # Timeout de leitura
                write=3.0,         # Timeout de escrita
                pool=10.0,         # Timeout para obter conexão do pool
            )
        )
        return PaymentResult.from_response(response)

# Uso com fallback
async def charge_customer(order_id: str, amount: float):
    try:
        result = await process_payment(amount)
    except pybreaker.CircuitBreakerError:
        # Circuito aberto — use fallback
        logger.warning("Circuit breaker aberto para gateway de pagamento")
        await queue.enqueue("retry_payment", {"order_id": order_id, "amount": amount})
        return PaymentResult(status="queued", message="Pagamento será processado em breve")
```

**Estados do Circuit Breaker:**

```
     ┌──── Sucesso ─────┐
     │                   │
     ▼                   │
  ┌──────┐  Falhas   ┌──────┐  Timeout  ┌───────────┐
  │CLOSED│─────────▶ │ OPEN │─────────▶│HALF-OPEN  │
  │      │ >= N      │      │ expirado  │           │
  └──────┘           └──────┘           └───────────┘
     ▲                                       │
     │              Sucesso                  │
     └───────────────────────────────────────┘
                    Falha ──▶ Volta para OPEN
```

---

## Testes no Backend

### Testes Unitários

Testam **regras de negócio e validações** de forma isolada, sem dependências externas.

```python
# Python — PyTest
import pytest
from decimal import Decimal

class TestOrderService:
    def test_calculate_total_with_discount(self):
        items = [
            OrderItem(product_id=1, quantity=2, unit_price=Decimal("50.00")),
            OrderItem(product_id=2, quantity=1, unit_price=Decimal("100.00")),
        ]
        discount = Decimal("10.00")  # 10%

        total = OrderService.calculate_total(items, discount_percent=discount)

        assert total == Decimal("180.00")  # (100 + 100) * 0.90

    def test_cannot_cancel_delivered_order(self):
        order = Order(id=1, status="delivered")

        with pytest.raises(BusinessRuleError, match="não pode ser cancelado"):
            OrderService.cancel(order)

    def test_password_must_have_minimum_strength(self):
        with pytest.raises(ValueError, match="maiúscula"):
            CreateUserRequest(name="João", email="j@t.com", password="senhafraca1!", cpf="12345678901", birth_date="2000-01-01")

    @pytest.mark.parametrize("status,can_edit", [
        ("pending", True),
        ("processing", True),
        ("shipped", False),
        ("delivered", False),
        ("cancelled", False),
    ])
    def test_order_editability_by_status(self, status, can_edit):
        order = Order(id=1, status=status)
        assert order.is_editable() == can_edit
```

```java
// Java — JUnit 5 + Mockito
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailSender emailSender;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldCreateUserSuccessfully() {
        var request = new CreateUserRequest("João", "joao@email.com");
        when(userRepository.existsByEmail("joao@email.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        var result = userService.create(request);

        assertThat(result.getName()).isEqualTo("João");
        verify(emailSender).sendWelcome("joao@email.com");
    }

    @Test
    void shouldThrowWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("existing@email.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(new CreateUserRequest("Maria", "existing@email.com")))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Email já cadastrado");
    }
}
```

```javascript
// Node.js — Jest
describe("OrderService", () => {
  it("should apply percentage discount correctly", () => {
    const items = [
      { productId: 1, quantity: 2, unitPrice: 50.0 },
      { productId: 2, quantity: 1, unitPrice: 100.0 },
    ];

    const total = OrderService.calculateTotal(items, { discountPercent: 10 });

    expect(total).toBe(180.0);
  });

  it("should throw when cancelling a delivered order", () => {
    const order = { id: 1, status: "delivered" };

    expect(() => OrderService.cancel(order)).toThrow("não pode ser cancelado");
  });

  it("should reject negative quantities", () => {
    const items = [{ productId: 1, quantity: -1, unitPrice: 50.0 }];

    expect(() => OrderService.calculateTotal(items)).toThrow("Quantidade inválida");
  });
});
```

### Testes de Integração

Testam a **interação real** entre componentes (endpoints, banco, cache).

```python
# Python — FastAPI + TestContainers + httpx
import pytest
from testcontainers.postgres import PostgresContainer
from httpx import AsyncClient

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.fixture
async def client(postgres):
    app.dependency_overrides[get_database_url] = lambda: postgres.get_connection_url()
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user_integration(client: AsyncClient):
    response = await client.post("/api/v1/users", json={
        "name": "Maria Silva",
        "email": "maria@teste.com",
        "password": "Senh@Forte123",
        "cpf": "12345678901",
        "birth_date": "2000-01-15"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "maria@teste.com"
    assert "password" not in data  # Senha não deve aparecer na resposta
    assert "id" in data

    # Verifica que foi realmente persistido
    get_response = await client.get(f"/api/v1/users/{data['id']}")
    assert get_response.status_code == 200

@pytest.mark.asyncio
async def test_duplicate_email_returns_409(client: AsyncClient):
    user_data = {
        "name": "João", "email": "joao@teste.com",
        "password": "Senh@Forte123", "cpf": "12345678901", "birth_date": "2000-01-15"
    }
    await client.post("/api/v1/users", json=user_data)

    response = await client.post("/api/v1/users", json=user_data)

    assert response.status_code == 409
    assert "já cadastrado" in response.json()["error"]["message"]
```

```javascript
// Node.js — Supertest + TestContainers
const { PostgreSqlContainer } = require("@testcontainers/postgresql");
const request = require("supertest");

describe("Users API", () => {
  let container;
  let app;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    process.env.DATABASE_URL = container.getConnectionUri();
    app = require("../src/app");
    await runMigrations();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  it("POST /api/v1/users - should create user", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .send({ name: "João", email: "joao@teste.com", password: "Senh@Forte123" })
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe("joao@teste.com");
    expect(res.body).not.toHaveProperty("password");
  });
});
```

### Testes de Contrato

Garantem que o **contrato entre serviços** (producer/consumer) não seja quebrado.

```python
# Pact — Consumer side (quem consome a API)
from pact import Consumer, Provider

pact = Consumer("OrderService").has_pact_with(Provider("PaymentService"))

def test_payment_service_contract():
    expected_body = {
        "id": "pay_123",
        "status": "approved",
        "amount": 199.90
    }

    pact.given("a valid payment request")\
        .upon_receiving("a charge request")\
        .with_request("POST", "/charges", body={"amount": 199.90, "currency": "BRL"})\
        .will_respond_with(201, body=expected_body)

    with pact:
        result = PaymentClient(pact.uri).charge(199.90, "BRL")
        assert result["status"] == "approved"
```

### Testes de Carga e Stress

```javascript
// k6 — teste de carga (JavaScript)
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 50 },    // Ramp-up para 50 VUs
    { duration: "5m", target: 50 },    // Sustenta 50 VUs por 5 min
    { duration: "2m", target: 200 },   // Ramp-up para 200 VUs
    { duration: "5m", target: 200 },   // Sustenta 200 VUs por 5 min
    { duration: "2m", target: 0 },     // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],  // p95 < 500ms
    http_req_failed: ["rate<0.01"],                   // < 1% de falhas
    http_reqs: ["rate>100"],                          // > 100 req/s
  },
};

export default function () {
  // Cenário: listar produtos e ver detalhes
  const listRes = http.get("https://api.empresa.com/api/v1/products?page=1&per_page=20");
  check(listRes, {
    "list status 200": (r) => r.status === 200,
    "list has products": (r) => JSON.parse(r.body).data.length > 0,
  });

  const products = JSON.parse(listRes.body).data;
  const productId = products[Math.floor(Math.random() * products.length)].id;

  const detailRes = http.get(`https://api.empresa.com/api/v1/products/${productId}`);
  check(detailRes, {
    "detail status 200": (r) => r.status === 200,
  });

  sleep(1); // Simula think time do usuário
}
```

```bash
# Executar teste de carga com k6
k6 run --out json=results.json load_test.js

# Artillery — alternativa mais simples (YAML)
# artillery.yml
config:
  target: "https://api.empresa.com"
  phases:
    - duration: 300
      arrivalRate: 20
      name: "Warm up"
    - duration: 600
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Browse products"
    flow:
      - get:
          url: "/api/v1/products?page=1"
          expect:
            - statusCode: 200
      - think: 2
      - get:
          url: "/api/v1/products/{{ $randomInt(1, 100) }}"
```

### Testes de Segurança

**SAST (Static Application Security Testing):**

```bash
# SonarQube — análise estática
docker run -d --name sonarqube -p 9000:9000 sonarqube:community

# Executar análise
sonar-scanner \
  -Dsonar.projectKey=meu-projeto \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=sqp_xxxxxxxxxxxx

# Bandit — análise de segurança específica para Python
pip install bandit
bandit -r src/ -f json -o bandit-report.json

# Semgrep — análise multi-linguagem
semgrep --config=auto src/
```

**DAST (Dynamic Application Security Testing):**

```bash
# OWASP ZAP — teste dinâmico contra API rodando
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t https://api-staging.empresa.com/openapi.json \
  -f openapi \
  -r zap-report.html \
  -w zap-report.md
```

### Mutation Testing

Verifica se seus testes **realmente detectam bugs**, mutando o código e vendo se os testes falham:

```bash
# Stryker (JavaScript/TypeScript)
npx stryker run

# PIT (Java)
mvn org.pitest:pitest-maven:mutationCoverage

# mutmut (Python)
mutmut run --paths-to-mutate=src/services/
mutmut results
```

| Métrica | Significado | Meta |
|---|---|---|
| **Mutation Score** | % de mutantes detectados (killed) | > 80% |
| **Survived Mutants** | Mutantes que não foram detectados | Investigar cada um |
| **Timed Out** | Mutantes que causaram loop infinito | Geralmente OK |

---

## Padrões de Projeto Comuns

### Repository Pattern

Abstrai o acesso a dados, permitindo trocar a implementação (banco, API, arquivo) sem alterar a lógica de negócio.

```python
# Interface (port)
from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: int) -> User | None: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def delete(self, user_id: int) -> None: ...

    @abstractmethod
    async def find_all(self, filters: UserFilters, pagination: Pagination) -> Page[User]: ...

# Implementação concreta
class PostgresUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, user_id: int) -> User | None:
        result = await self.session.get(UserModel, user_id)
        return result.to_entity() if result else None

    async def save(self, user: User) -> User:
        model = UserModel.from_entity(user)
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

# Implementação para testes
class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self.users: dict[int, User] = {}

    async def find_by_id(self, user_id: int) -> User | None:
        return self.users.get(user_id)

    async def save(self, user: User) -> User:
        self.users[user.id] = user
        return user
```

### Service Layer

Orquestra a lógica de negócio, coordenando repositórios e serviços externos.

```python
class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        product_repo: ProductRepository,
        payment_service: PaymentService,
        notification_service: NotificationService,
    ):
        self.order_repo = order_repo
        self.product_repo = product_repo
        self.payment_service = payment_service
        self.notification_service = notification_service

    async def place_order(self, request: PlaceOrderRequest, user: User) -> Order:
        # 1. Validar produtos e estoque
        products = await self.product_repo.find_by_ids(request.product_ids)
        self._validate_stock(products, request.items)

        # 2. Calcular total
        total = self._calculate_total(request.items, products)

        # 3. Criar pedido
        order = Order(
            customer_id=user.id,
            items=request.items,
            total=total,
            status="pending",
        )
        saved_order = await self.order_repo.save(order)

        # 4. Processar pagamento
        payment = await self.payment_service.charge(
            amount=total,
            method=request.payment_method,
            idempotency_key=f"order-{saved_order.id}",
        )

        # 5. Atualizar status
        saved_order.status = "confirmed" if payment.approved else "payment_failed"
        await self.order_repo.update(saved_order)

        # 6. Notificar
        await self.notification_service.send_order_confirmation(saved_order)

        return saved_order
```

### Factory

Encapsula a lógica de criação de objetos complexos.

```python
class NotificationFactory:
    @staticmethod
    def create(channel: str, config: dict) -> NotificationSender:
        match channel:
            case "email":
                return EmailSender(smtp_host=config["smtp_host"], api_key=config["api_key"])
            case "sms":
                return SmsSender(provider=config["sms_provider"], api_key=config["api_key"])
            case "push":
                return PushSender(firebase_key=config["firebase_key"])
            case "whatsapp":
                return WhatsAppSender(api_url=config["whatsapp_api_url"])
            case _:
                raise ValueError(f"Canal de notificação não suportado: {channel}")

# Uso
sender = NotificationFactory.create("email", app_config)
await sender.send(recipient, message)
```

### Strategy

Permite trocar algoritmos em tempo de execução.

```python
from abc import ABC, abstractmethod

class PricingStrategy(ABC):
    @abstractmethod
    def calculate(self, base_price: Decimal, context: PricingContext) -> Decimal: ...

class RegularPricing(PricingStrategy):
    def calculate(self, base_price: Decimal, context: PricingContext) -> Decimal:
        return base_price

class VipPricing(PricingStrategy):
    def calculate(self, base_price: Decimal, context: PricingContext) -> Decimal:
        return base_price * Decimal("0.85")  # 15% desconto VIP

class BlackFridayPricing(PricingStrategy):
    def calculate(self, base_price: Decimal, context: PricingContext) -> Decimal:
        discount = min(context.cart_total * Decimal("0.001"), Decimal("0.30"))  # Até 30%
        return base_price * (1 - discount)

class PricingService:
    def __init__(self):
        self.strategies: dict[str, PricingStrategy] = {
            "regular": RegularPricing(),
            "vip": VipPricing(),
            "black_friday": BlackFridayPricing(),
        }

    def get_price(self, product: Product, user: User, context: PricingContext) -> Decimal:
        strategy_key = self._resolve_strategy(user, context)
        strategy = self.strategies[strategy_key]
        return strategy.calculate(product.price, context)
```

### Observer / Event-Driven

Desacopla componentes usando eventos — quem emite não sabe quem consome.

```python
# Event bus simples
from collections import defaultdict
from typing import Callable, Any

class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Callable):
        self._handlers[event_type].append(handler)

    async def publish(self, event_type: str, data: Any):
        for handler in self._handlers[event_type]:
            try:
                await handler(data)
            except Exception as e:
                logger.error(f"Erro no handler de {event_type}", exc_info=e)

# Registro de handlers
event_bus = EventBus()
event_bus.subscribe("order.created", send_confirmation_email)
event_bus.subscribe("order.created", update_inventory)
event_bus.subscribe("order.created", notify_warehouse)
event_bus.subscribe("user.registered", send_welcome_email)
event_bus.subscribe("user.registered", create_default_preferences)

# Uso no service
class OrderService:
    async def place_order(self, request: PlaceOrderRequest) -> Order:
        order = await self.order_repo.save(Order(...))
        await self.event_bus.publish("order.created", order)
        return order
```

**Para sistemas distribuídos**, use message brokers:

| Broker | Uso Principal | Garantia de Entrega |
|---|---|---|
| **RabbitMQ** | Task queues, RPC | At-least-once |
| **Apache Kafka** | Event streaming, logs | At-least-once, exactly-once (com transações) |
| **Redis Streams** | Lightweight streaming | At-least-once |
| **AWS SQS/SNS** | Cloud-native queues | At-least-once |
| **Google Pub/Sub** | Cloud-native pub/sub | At-least-once |

### CQRS (Command Query Responsibility Segregation)

Separa operações de **leitura** (queries) e **escrita** (commands) em modelos distintos.

```python
# Command side — otimizado para escrita
class CreateOrderCommand:
    customer_id: int
    items: list[OrderItem]
    payment_method: str

class OrderCommandHandler:
    async def handle(self, command: CreateOrderCommand) -> str:
        order = Order.create(command)
        await self.write_repo.save(order)
        await self.event_bus.publish("order.created", order.to_event())
        return order.id

# Query side — otimizado para leitura (pode ser denormalizado)
class OrderQueryHandler:
    async def get_order_summary(self, order_id: str) -> OrderSummaryView:
        # Lê de uma view materializada, cache Redis, ou banco separado
        return await self.read_repo.get_summary(order_id)

    async def list_orders(self, filters: OrderFilters) -> Page[OrderListItem]:
        # Lê de uma tabela denormalizada otimizada para listagem
        return await self.read_repo.list(filters)
```

> [!TIP]
> CQRS adiciona **complexidade significativa**. Use apenas quando há diferença clara entre padrões de leitura e escrita, ou quando precisa escalar leitura e escrita independentemente.

### Saga Pattern

Gerencia transações distribuídas entre múltiplos serviços.

```python
# Saga orquestrada — um orquestrador central coordena os passos
class OrderSaga:
    def __init__(
        self,
        order_service: OrderService,
        payment_service: PaymentService,
        inventory_service: InventoryService,
        shipping_service: ShippingService,
    ):
        self.steps = [
            SagaStep(
                execute=order_service.create,
                compensate=order_service.cancel,
                name="create_order",
            ),
            SagaStep(
                execute=inventory_service.reserve,
                compensate=inventory_service.release,
                name="reserve_inventory",
            ),
            SagaStep(
                execute=payment_service.charge,
                compensate=payment_service.refund,
                name="process_payment",
            ),
            SagaStep(
                execute=shipping_service.schedule,
                compensate=shipping_service.cancel_schedule,
                name="schedule_shipping",
            ),
        ]

    async def execute(self, context: SagaContext):
        completed_steps = []

        for step in self.steps:
            try:
                result = await step.execute(context)
                context.add_result(step.name, result)
                completed_steps.append(step)
            except Exception as e:
                logger.error(f"Saga falhou no passo '{step.name}'", exc_info=e)
                # Compensa todos os passos já executados (na ordem reversa)
                for completed_step in reversed(completed_steps):
                    try:
                        await completed_step.compensate(context)
                    except Exception as comp_error:
                        logger.critical(
                            f"Falha na compensação do passo '{completed_step.name}'",
                            exc_info=comp_error
                        )
                        # Alerta humano — requer intervenção manual
                        await alert_ops_team(step=completed_step.name, error=comp_error)
                raise SagaFailedError(f"Saga falhou no passo '{step.name}'", cause=e)

        return context
```

**Saga orquestrada vs coreografada:**

| Aspecto | Orquestrada | Coreografada |
|---|---|---|
| **Coordenação** | Orquestrador central | Eventos distribuídos |
| **Visibilidade** | Alta (fluxo centralizado) | Baixa (distribuído) |
| **Acoplamento** | Orquestrador conhece todos os passos | Serviços são independentes |
| **Complexidade** | Menor para fluxos lineares | Menor para fluxos simples |
| **Debug** | Mais fácil | Mais difícil (event tracing) |
| **Melhor para** | Fluxos complexos com muitos passos | Fluxos simples com poucos serviços |

---

## Checklist de Revisão Backend

Use este checklist ao revisar código ou preparar deploys.

### Arquitetura e Código

- [ ] Responsabilidades estão claramente separadas (controller → service → repository)
- [ ] Nenhuma lógica de negócio nos controllers
- [ ] Injeção de dependências usada consistentemente (sem `new` hardcoded em services)
- [ ] Nomes de classes, métodos e variáveis são descritivos e seguem convenção do projeto
- [ ] Código morto / comentado removido
- [ ] Complexidade ciclomática razoável (métodos com < 10 caminhos)
- [ ] Princípio DRY aplicado sem abstrações prematuras
- [ ] Tratamento de erros consistente com exceções tipadas
- [ ] Stack traces nunca expostos em respostas de API

### API

- [ ] Endpoints seguem convenções REST (substantivos no plural, verbos HTTP corretos)
- [ ] Status codes HTTP corretos para cada cenário
- [ ] Paginação implementada para listagens
- [ ] Validação de entrada em todos os endpoints (schemas/DTOs)
- [ ] Respostas de erro padronizadas (formato consistente)
- [ ] Documentação OpenAPI atualizada e precisa
- [ ] Versionamento de API definido e aplicado
- [ ] Rate limiting configurado para endpoints públicos
- [ ] Endpoints sensíveis têm throttling mais restritivo

### Banco de Dados

- [ ] Migrations versionadas e com `downgrade()` funcional
- [ ] Índices criados para queries frequentes (verificado com `EXPLAIN ANALYZE`)
- [ ] Sem N+1 queries (eager loading onde necessário)
- [ ] Connection pooling configurado adequadamente
- [ ] Transações usadas para operações multi-tabela
- [ ] Nenhum `SELECT *` em código de produção
- [ ] Dados sensíveis criptografados em repouso
- [ ] Backups testados e processo de restore documentado

### Segurança

- [ ] Toda entrada do usuário é validada e sanitizada
- [ ] Autenticação obrigatória em endpoints protegidos
- [ ] Autorização verificada em cada operação (não apenas na rota)
- [ ] Senhas armazenadas com bcrypt ou argon2 (nunca plaintext ou SHA/MD5)
- [ ] JWTs com duração curta (≤ 15 min para access token)
- [ ] Prepared statements / ORM para todas as queries (sem concatenação de SQL)
- [ ] CORS configurado restritivamente (sem `allow_origins=["*"]` em produção)
- [ ] Headers de segurança aplicados (HSTS, CSP, X-Content-Type-Options, etc.)
- [ ] Mass assignment prevenido (schemas explícitos de entrada)
- [ ] Secrets em variáveis de ambiente ou vault (nunca hardcoded)
- [ ] Dependências auditadas (`npm audit`, `pip-audit`, Snyk)
- [ ] Audit logs para operações críticas

### Testes

- [ ] Testes unitários cobrem regras de negócio e validações
- [ ] Testes de integração cobrem endpoints principais
- [ ] Testes rodam em CI pipeline automaticamente
- [ ] Cobertura de testes > 80% (com foco em caminhos críticos)
- [ ] Cenários de erro testados (não apenas happy path)
- [ ] Dados de teste isolados (não dependem de estado externo)
- [ ] Nenhum dado sensível real em fixtures de teste

### Observabilidade

- [ ] Logging estruturado (JSON) em todos os serviços
- [ ] Correlation ID propagado em toda a cadeia de chamadas
- [ ] Métricas de negócio e técnicas expostas (RED: Rate, Errors, Duration)
- [ ] Traces distribuídos configurados (OpenTelemetry)
- [ ] Alertas configurados para SLOs críticos
- [ ] Health check endpoint implementado (`/health`, `/readiness`)
- [ ] Dashboards de monitoramento criados (Grafana, Datadog, etc.)

### Resiliência

- [ ] Timeouts configurados para todas as chamadas externas
- [ ] Circuit breaker implementado para serviços downstream
- [ ] Retries com backoff exponencial e jitter
- [ ] Operações críticas são idempotentes
- [ ] Graceful shutdown implementado
- [ ] Filas de dead-letter configuradas para mensageria
- [ ] Fallbacks definidos para falhas de serviços externos

### Deploy e Infraestrutura

- [ ] Variáveis de configuração externalizadas (env vars, config maps)
- [ ] Docker image otimizada (multi-stage build, imagem base mínima)
- [ ] Readiness e liveness probes configurados
- [ ] Limites de CPU e memória definidos
- [ ] Scaling horizontal configurado (HPA, autoscaling)
- [ ] Pipeline de CI/CD configurado e testado
- [ ] Rollback automatizado em caso de falha
- [ ] Banco de dados tem backup automático e testado

---

> [!NOTE]
> Este guia é um ponto de partida. Adapte as práticas ao contexto do projeto — nem toda aplicação precisa de CQRS, Sagas ou HATEOAS. Priorize as práticas que resolvem problemas reais e mensuráveis da sua equipe.
