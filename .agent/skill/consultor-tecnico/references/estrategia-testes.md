# Estratégia de Testes

> Guia completo para definir, implementar e evoluir a estratégia de testes de qualquer projeto de software.

---

## Pirâmide de Testes

A pirâmide de testes é o modelo mental mais importante para distribuir o esforço de testes. A ideia central: **quanto mais próximo do código, mais testes; quanto mais próximo do usuário, menos testes (porém mais valiosos por teste)**.

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          ← Poucos (5-10%)
                 ╱______╲           Lentos, frágeis, caros
                ╱        ╲
               ╱Integração╲      ← Moderados (15-25%)
              ╱____________╲        Velocidade média, escopo médio
             ╱              ╲
            ╱   Unitários    ╲    ← Muitos (60-80%)
           ╱__________________╲     Rápidos, baratos, estáveis
```

| Camada       | Quantidade | Velocidade   | Custo de Manutenção | Confiança no Deploy |
|--------------|------------|--------------|----------------------|---------------------|
| E2E          | 5-10%      | Lenta (s/min)| Alto                 | Alta por teste      |
| Integração   | 15-25%     | Média (ms/s) | Médio                | Média por teste     |
| Unitário     | 60-80%     | Rápida (ms)  | Baixo                | Baixa por teste     |

> [!IMPORTANT]
> A pirâmide é um **guia**, não uma regra absoluta. Projetos CRUD simples podem investir mais em integração. Bibliotecas/SDKs devem investir pesado em unitários. Aplicações críticas de UI precisam de mais E2E.

### Anti-padrões

| Anti-padrão         | Descrição                                                    | Problema                                    |
|---------------------|--------------------------------------------------------------|---------------------------------------------|
| Cone de Sorvete     | Muitos E2E, poucos unitários                                 | Suite lenta, frágil e cara de manter        |
| Cupcake             | Testes duplicados em todas as camadas para a mesma coisa     | Desperdício de esforço, falsos positivos    |
| Pirâmide Invertida  | Apenas E2E, zero unitários                                   | Feedback loop lento, difícil debugar falhas |
| Deserto de Testes   | Nenhum teste automatizado                                    | Zero confiança no deploy                    |

---

## Tipos de Teste

### 1. Testes Unitários

**O que é:** Testa uma unidade isolada de código (função, método, classe) sem dependências externas. Dependências são substituídas por mocks, stubs ou fakes.

**Quando usar:** Sempre. É a base da pirâmide. Para lógica de negócio, validações, transformações de dados, cálculos, utilitários.

**Ferramentas:**

| Linguagem    | Ferramenta Principal | Alternativas              |
|--------------|----------------------|---------------------------|
| JavaScript   | Jest                 | Vitest, Mocha + Chai      |
| TypeScript   | Vitest               | Jest + ts-jest             |
| Python       | PyTest               | unittest, nose2            |
| Java         | JUnit 5              | TestNG                    |
| C#           | xUnit                | NUnit, MSTest             |
| Go           | testing (stdlib)     | testify                   |
| Rust         | cargo test (stdlib)  | —                         |
| PHP          | PHPUnit              | Pest                      |

**Exemplo prático — JavaScript com Vitest:**

```javascript
// src/utils/price.js
export function calcularDesconto(preco, percentual) {
  if (preco < 0) throw new Error('Preço não pode ser negativo');
  if (percentual < 0 || percentual > 100) throw new Error('Percentual inválido');
  return preco - (preco * percentual / 100);
}

// src/utils/price.test.js
import { describe, it, expect } from 'vitest';
import { calcularDesconto } from './price';

describe('calcularDesconto', () => {
  it('deve aplicar desconto de 10% em R$100', () => {
    expect(calcularDesconto(100, 10)).toBe(90);
  });

  it('deve retornar o preço original quando desconto é 0%', () => {
    expect(calcularDesconto(200, 0)).toBe(200);
  });

  it('deve retornar 0 quando desconto é 100%', () => {
    expect(calcularDesconto(150, 100)).toBe(0);
  });

  it('deve lançar erro para preço negativo', () => {
    expect(() => calcularDesconto(-10, 5)).toThrow('Preço não pode ser negativo');
  });

  it('deve lançar erro para percentual maior que 100', () => {
    expect(() => calcularDesconto(100, 150)).toThrow('Percentual inválido');
  });
});
```

**Exemplo prático — Python com PyTest:**

```python
# src/services/tax_calculator.py
class TaxCalculator:
    RATES = {"SP": 0.18, "RJ": 0.20, "MG": 0.17}

    def calculate(self, amount: float, state: str) -> float:
        if state not in self.RATES:
            raise ValueError(f"Estado não suportado: {state}")
        return round(amount * self.RATES[state], 2)

# tests/test_tax_calculator.py
import pytest
from src.services.tax_calculator import TaxCalculator

@pytest.fixture
def calculator():
    return TaxCalculator()

class TestTaxCalculator:
    def test_calcula_icms_sp(self, calculator):
        assert calculator.calculate(1000, "SP") == 180.0

    def test_calcula_icms_rj(self, calculator):
        assert calculator.calculate(1000, "RJ") == 200.0

    @pytest.mark.parametrize("amount,state,expected", [
        (100, "SP", 18.0),
        (100, "RJ", 20.0),
        (100, "MG", 17.0),
    ])
    def test_calcula_varios_estados(self, calculator, amount, state, expected):
        assert calculator.calculate(amount, state) == expected

    def test_erro_estado_invalido(self, calculator):
        with pytest.raises(ValueError, match="Estado não suportado"):
            calculator.calculate(100, "XX")
```

---

### 2. Testes de Integração

**O que é:** Testa a interação entre dois ou mais componentes reais — API com banco de dados, serviço com fila de mensagens, módulo com API externa.

**Quando usar:** Para validar que componentes funcionam juntos. Endpoints de API, queries no banco, interação com cache, envio de mensagens.

**Ferramentas:**

| Ferramenta      | Uso Principal                                      | Linguagens          |
|-----------------|----------------------------------------------------|---------------------|
| Supertest       | Testar APIs HTTP (Express, Fastify, Koa)           | Node.js             |
| TestContainers  | Subir containers Docker para dependências reais    | Java, Node, Python, Go, .NET |
| WireMock        | Mock de APIs HTTP externas                         | Java, standalone    |
| httpx / pytest  | Testar APIs HTTP em FastAPI/Django                 | Python              |
| WebApplicationFactory | Testar APIs ASP.NET in-memory               | C# / .NET           |

**Exemplo prático — Node.js com Supertest + TestContainers:**

```javascript
// tests/integration/users.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer } from 'testcontainers';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';

describe('POST /api/users', () => {
  let container;
  let app;
  let request;

  beforeAll(async () => {
    // Sobe um PostgreSQL real em container
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    const dbUrl = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/testdb`;
    app = await createApp({ databaseUrl: dbUrl });
    request = supertest(app);
  }, 60_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('deve criar um usuário e retornar 201', async () => {
    const response = await request
      .post('/api/users')
      .send({ name: 'João Silva', email: 'joao@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'João Silva',
      email: 'joao@example.com',
    });
  });

  it('deve retornar 409 para email duplicado', async () => {
    await request.post('/api/users')
      .send({ name: 'Maria', email: 'duplicado@example.com' })
      .expect(201);

    await request.post('/api/users')
      .send({ name: 'Pedro', email: 'duplicado@example.com' })
      .expect(409);
  });

  it('deve retornar 400 para email inválido', async () => {
    await request.post('/api/users')
      .send({ name: 'Ana', email: 'invalido' })
      .expect(400);
  });
});
```

**Exemplo prático — Python com FastAPI + TestContainers:**

```python
# tests/integration/test_orders_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from testcontainers.postgres import PostgresContainer

from src.main import create_app
from src.database import run_migrations

@pytest.fixture(scope="module")
def postgres():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.fixture(scope="module")
def app(postgres):
    database_url = postgres.get_connection_url()
    app = create_app(database_url=database_url)
    run_migrations(database_url)
    return app

@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_criar_pedido(client):
    response = await client.post("/api/orders", json={
        "customer_id": "cust-123",
        "items": [{"product_id": "prod-1", "quantity": 2}]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert len(data["items"]) == 1
```

---

### 3. Testes End-to-End (E2E)

**O que é:** Testa o sistema completo do ponto de vista do usuário — navegador interagindo com a aplicação real, simulando cliques, preenchimento de formulários e navegação.

**Quando usar:** Para fluxos críticos de negócio: login, checkout, cadastro, fluxo de pagamento. Mantenha poucos e focados.

**Ferramentas:**

| Ferramenta  | Vantagens                                      | Desvantagens                     |
|-------------|-------------------------------------------------|----------------------------------|
| Playwright  | Multi-browser, rápido, auto-wait, API moderna  | Requer Node.js (ou Python/.NET)  |
| Cypress     | DX excelente, time-travel debugging            | Apenas Chromium (e Firefox beta) |
| Selenium    | Suporte amplo, muitas linguagens               | Lento, API verbosa, frágil       |

**Exemplo prático — Playwright:**

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Fluxo de Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'cliente@example.com');
    await page.fill('[data-testid="password"]', 'SenhaSegura123!');
    await page.click('[data-testid="btn-login"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('deve completar compra com cartão de crédito', async ({ page }) => {
    // Adicionar produto ao carrinho
    await page.goto('/products');
    await page.click('[data-testid="product-card-001"] >> text=Adicionar');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

    // Ir para o checkout
    await page.click('[data-testid="btn-checkout"]');
    await expect(page).toHaveURL('/checkout');

    // Preencher dados de pagamento
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvv"]', '123');

    // Finalizar compra
    await page.click('[data-testid="btn-finalizar"]');

    // Verificar confirmação
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-status"]')).toHaveText('Pedido Confirmado');
  });

  test('deve exibir erro para cartão recusado', async ({ page }) => {
    await page.goto('/products');
    await page.click('[data-testid="product-card-001"] >> text=Adicionar');
    await page.click('[data-testid="btn-checkout"]');

    await page.fill('[data-testid="card-number"]', '4000000000000002'); // cartão de teste p/ recusa
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvv"]', '123');
    await page.click('[data-testid="btn-finalizar"]');

    await expect(page.locator('[data-testid="payment-error"]'))
      .toHaveText('Pagamento recusado. Tente outro cartão.');
  });
});
```

---

### 4. Testes de Contrato

**O que é:** Valida que a comunicação entre serviços (producer e consumer) respeita um contrato definido — formato de request/response, campos obrigatórios, tipos de dados.

**Quando usar:** Em arquiteturas de microsserviços. Quando times diferentes mantêm serviços que se comunicam via API. Evita quebras silenciosas entre serviços.

**Ferramentas:**

| Ferramenta | Abordagem            | Melhor para                           |
|------------|----------------------|---------------------------------------|
| Pact       | Consumer-Driven      | Microsserviços com múltiplos consumers|
| Dredd      | API Blueprint/OpenAPI | APIs documentadas com spec definida   |
| Schemathesis | Property-based     | Fuzzing baseado em OpenAPI spec       |

**Exemplo prático — Pact (Consumer side, JavaScript):**

```javascript
// tests/contract/user-service.consumer.test.js
import { PactV3 } from '@pact-foundation/pact';
import { UserApiClient } from '../../src/clients/user-api';

const provider = new PactV3({
  consumer: 'OrderService',
  provider: 'UserService',
  dir: './pacts',
});

describe('UserService Contract', () => {
  it('deve retornar dados do usuário pelo ID', async () => {
    // Arrange: definir a expectativa do contrato
    provider
      .given('usuário com ID user-123 existe')
      .uponReceiving('requisição para buscar usuário por ID')
      .withRequest({
        method: 'GET',
        path: '/api/users/user-123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 'user-123',
          name: 'João Silva',
          email: 'joao@example.com',
          active: true,
        },
      });

    // Act + Assert: executar contra o mock do Pact
    await provider.executeTest(async (mockServer) => {
      const client = new UserApiClient(mockServer.url);
      const user = await client.getUserById('user-123');

      expect(user.id).toBe('user-123');
      expect(user.name).toBe('João Silva');
      expect(user.active).toBe(true);
    });
  });
});
```

---

### 5. Testes de Carga e Stress

**O que é:** Testa o comportamento do sistema sob carga — verifica throughput, latência, uso de recursos e ponto de ruptura.

**Quando usar:** Antes de lançamentos, quando mudar infraestrutura, para definir SLAs, para validar auto-scaling.

**Tipos de teste de performance:**

| Tipo       | Objetivo                                               | Padrão de Carga               |
|------------|--------------------------------------------------------|-------------------------------|
| Load       | Comportamento sob carga esperada                       | Rampa gradual até carga alvo  |
| Stress     | Encontrar o ponto de ruptura                           | Rampa além da capacidade      |
| Spike      | Resposta a picos súbitos                               | Salto abrupto de carga        |
| Soak       | Estabilidade em carga prolongada (memory leaks)        | Carga constante por horas     |
| Breakpoint | Determinar capacidade máxima                           | Incremento contínuo até falha |

**Ferramentas:**

| Ferramenta | Linguagem de Script | Ideal para                           |
|------------|---------------------|--------------------------------------|
| k6         | JavaScript          | Developers, CI/CD, scripts como código|
| Artillery  | YAML/JavaScript     | Testes rápidos, protocolo WebSocket  |
| JMeter     | GUI/XML             | QA teams, testes complexos com GUI   |
| Locust     | Python              | Pythonistas, cenários programáticos  |
| Gatling    | Scala/Java          | JVM ecosystem, relatórios avançados  |

**Exemplo prático — k6:**

```javascript
// load-tests/api-checkout.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Rampa: 0 → 50 usuários em 1 min
    { duration: '3m', target: 50 },   // Carga constante: 50 usuários por 3 min
    { duration: '2m', target: 200 },  // Stress: 50 → 200 usuários em 2 min
    { duration: '3m', target: 200 },  // Carga alta constante por 3 min
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],  // 95% < 500ms, 99% < 1.5s
    errors: ['rate<0.05'],                             // Menos de 5% de erros
    checkout_duration: ['p(95)<2000'],                 // Checkout 95% < 2s
  },
};

export default function () {
  // 1. Login
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    email: `user${__VU}@loadtest.com`,
    password: 'LoadTest123!',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login status 200': (r) => r.status === 200 });
  const token = loginRes.json('access_token');

  // 2. Checkout
  const start = Date.now();
  const checkoutRes = http.post('https://api.example.com/api/checkout', JSON.stringify({
    items: [{ product_id: 'prod-001', quantity: 1 }],
    payment_method: 'credit_card',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  checkoutDuration.add(Date.now() - start);
  errorRate.add(checkoutRes.status !== 201);

  check(checkoutRes, {
    'checkout status 201': (r) => r.status === 201,
    'tem order_id': (r) => r.json('order_id') !== undefined,
  });

  sleep(1); // Think time entre requisições
}
```

**Exemplo prático — Locust (Python):**

```python
# load_tests/locustfile.py
from locust import HttpUser, task, between

class CheckoutUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://api.example.com"

    def on_start(self):
        response = self.client.post("/auth/login", json={
            "email": "loadtest@example.com",
            "password": "LoadTest123!"
        })
        self.token = response.json()["access_token"]

    @task(3)
    def listar_produtos(self):
        self.client.get("/api/products", headers={
            "Authorization": f"Bearer {self.token}"
        })

    @task(1)
    def fazer_checkout(self):
        self.client.post("/api/checkout", json={
            "items": [{"product_id": "prod-001", "quantity": 1}],
            "payment_method": "pix"
        }, headers={
            "Authorization": f"Bearer {self.token}"
        })
```

---

### 6. Testes de Segurança — SAST (Static Application Security Testing)

**O que é:** Analisa o código-fonte estático em busca de vulnerabilidades — SQL injection, XSS, secrets expostos, dependências vulneráveis.

**Quando usar:** Em todo commit (no CI). Roda antes do deploy. É rápido e barato.

**Ferramentas:**

| Ferramenta  | Tipo                    | Linguagens Suportadas            | Integração CI     |
|-------------|-------------------------|-----------------------------------|--------------------|
| SonarQube   | Qualidade + Segurança   | 30+ linguagens                   | Jenkins, GitHub, GitLab |
| Semgrep     | Pattern matching        | 20+ linguagens                   | CLI, GitHub Actions |
| CodeQL      | Análise semântica       | Java, JS, Python, C++, Go, Ruby  | GitHub nativo      |
| Snyk Code   | AI-powered              | JS, Python, Java, Go, .NET       | CLI, IDE, CI       |
| Trivy       | Containers + IaC + deps | Multi                            | CLI, GitHub Actions |
| Bandit      | Segurança Python        | Python                           | CLI, pre-commit    |

**Exemplo prático — Semgrep no CI (GitHub Actions):**

```yaml
# .github/workflows/sast.yml
name: SAST Security Scan
on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/nodejs
            p/owasp-top-ten
            p/secrets
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

**Exemplo de regra Semgrep customizada:**

```yaml
# .semgrep/custom-rules.yml
rules:
  - id: no-hardcoded-jwt-secret
    patterns:
      - pattern: jwt.sign($PAYLOAD, "...")
    message: "Não use secret JWT hardcoded. Use variável de ambiente."
    severity: ERROR
    languages: [javascript, typescript]

  - id: no-raw-sql-queries
    patterns:
      - pattern: $DB.query(`...${$VAR}...`)
    message: "SQL injection potencial. Use parameterized queries."
    severity: ERROR
    languages: [javascript, typescript]
```

---

### 7. Testes de Segurança — DAST (Dynamic Application Security Testing)

**O que é:** Testa a aplicação em execução simulando ataques reais — crawl de endpoints, fuzzing de parâmetros, injeção de payloads maliciosos.

**Quando usar:** Em ambiente de staging/homologação. Antes de releases para produção. Complementa o SAST.

**Ferramentas:**

| Ferramenta  | Tipo           | Custo      | Melhor para                      |
|-------------|----------------|------------|----------------------------------|
| OWASP ZAP   | Proxy + Scanner| Gratuito   | CI/CD, automação, APIs REST      |
| Burp Suite  | Proxy + Scanner| Pago (Pro) | Pentesting manual, bug bounty    |
| Nuclei      | Template-based | Gratuito   | Scanning rápido e customizável   |
| Nikto       | Web scanner    | Gratuito   | Scan rápido de configurações     |

**Exemplo prático — OWASP ZAP no CI:**

```yaml
# .github/workflows/dast.yml
name: DAST Security Scan
on:
  workflow_run:
    workflows: ["Deploy to Staging"]
    types: [completed]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.9.0
        with:
          target: 'https://staging-api.example.com/openapi.json'
          format: openapi
          cmd_options: >
            -c zap-config.conf
            -I  # não falhar em warnings, só em erros
          fail_action: true  # falhar o pipeline se encontrar vulnerabilidades HIGH

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

---

### 8. Testes de Regressão Visual

**O que é:** Captura screenshots de componentes/páginas e compara pixel a pixel com uma baseline aprovada. Detecta mudanças visuais inesperadas.

**Quando usar:** Em design systems, componentes UI, landing pages, emails. Quando CSS/layout é crítico.

**Ferramentas:**

| Ferramenta  | Tipo               | Integração               | Custo              |
|-------------|---------------------|--------------------------|---------------------|
| Chromatic   | Cloud (Storybook)  | Storybook, CI/CD          | Freemium            |
| Percy       | Cloud              | Cypress, Playwright, CI   | Pago                |
| BackstopJS  | Self-hosted        | Docker, CI                | Gratuito            |
| Playwright  | Built-in           | Nativo                    | Gratuito            |
| Loki        | Self-hosted        | Storybook                 | Gratuito            |

**Exemplo prático — Playwright Visual Regression:**

```typescript
// e2e/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Regressão Visual - Homepage', () => {
  test('desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,  // Tolera 1% de diferença
    });
  });

  test('mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('componente de card de produto', async ({ page }) => {
    await page.goto('/products');
    const card = page.locator('[data-testid="product-card"]').first();
    await expect(card).toHaveScreenshot('product-card.png');
  });
});
```

**Exemplo prático — BackstopJS:**

```json
// backstop.json
{
  "id": "meu-projeto",
  "viewports": [
    { "label": "phone", "width": 375, "height": 812 },
    { "label": "tablet", "width": 768, "height": 1024 },
    { "label": "desktop", "width": 1920, "height": 1080 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "http://localhost:3000/",
      "delay": 2000,
      "misMatchThreshold": 0.1,
      "requireSameDimensions": true
    },
    {
      "label": "Página de Login",
      "url": "http://localhost:3000/login",
      "delay": 1000,
      "selectors": ["[data-testid='login-form']"]
    }
  ],
  "engine": "playwright",
  "report": ["browser"],
  "debug": false
}
```

```bash
# Gerar baseline
npx backstop reference

# Comparar com baseline
npx backstop test

# Aprovar mudanças como nova baseline
npx backstop approve
```

---

### 9. Testes de Acessibilidade

**O que é:** Verifica que a aplicação é utilizável por pessoas com deficiências — leitores de tela, navegação por teclado, contraste de cores, semântica HTML.

**Quando usar:** Em toda aplicação web. É requisito legal em muitos países (LGPD, ADA, EAA). Deve ser automatizado no CI.

**Ferramentas:**

| Ferramenta   | Tipo            | Regras Base      | Integração            |
|--------------|-----------------|------------------|-----------------------|
| axe-core     | Lib/engine      | WCAG 2.1 AA      | Playwright, Cypress, Jest |
| Pa11y        | CLI + CI        | WCAG 2.1 AA      | CLI, GitHub Actions   |
| Lighthouse   | Auditoria geral | WCAG + perf      | Chrome, CI            |
| jest-axe     | Jest matcher    | WCAG 2.1 AA      | Jest, Vitest          |

**Exemplo prático — axe-core com Playwright:**

```typescript
// e2e/a11y/homepage.a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade', () => {
  test('homepage não deve ter violações WCAG AA', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('#third-party-widget') // excluir widgets de terceiros
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('formulário de cadastro deve ser acessível', async ({ page }) => {
    await page.goto('/register');

    const results = await new AxeBuilder({ page })
      .include('[data-testid="register-form"]')
      .analyze();

    // Log detalhado das violações para debugar
    if (results.violations.length > 0) {
      console.log('Violações encontradas:');
      results.violations.forEach(v => {
        console.log(`- ${v.id}: ${v.description}`);
        console.log(`  Impacto: ${v.impact}`);
        console.log(`  Elementos: ${v.nodes.map(n => n.html).join(', ')}`);
      });
    }

    expect(results.violations).toEqual([]);
  });
});
```

**Exemplo prático — Pa11y no CI:**

```yaml
# .github/workflows/a11y.yml
name: Accessibility Tests
on: [push]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - run: npx wait-on http://localhost:3000

      - name: Pa11y CI
        run: npx pa11y-ci
```

```json
// .pa11yci
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000,
    "wait": 2000,
    "runners": ["axe"]
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/register",
    "http://localhost:3000/products",
    {
      "url": "http://localhost:3000/checkout",
      "actions": [
        "set field #email to test@example.com",
        "click element #btn-continue",
        "wait for element #payment-form to be visible"
      ]
    }
  ]
}
```

---

### 10. Chaos Engineering

**O que é:** Injeta falhas intencionais no sistema em produção (ou staging) para verificar resiliência — derrubar pods, aumentar latência, corromper rede, encher disco.

**Quando usar:** Quando o sistema precisa ser resiliente. Após implementar circuit breakers, retries, fallbacks. Para validar que alarmes e alertas funcionam.

**Ferramentas:**

| Ferramenta     | Plataforma       | Tipo de Falha                                | Custo      |
|----------------|------------------|----------------------------------------------|------------|
| Chaos Monkey   | AWS/Netflix      | Terminar instâncias aleatoriamente           | Gratuito   |
| Litmus         | Kubernetes       | Pod kill, network chaos, disk fill           | Gratuito   |
| Gremlin        | Multi-plataforma | CPU, rede, disco, processo, DNS              | Pago       |
| Chaos Mesh     | Kubernetes       | Pod chaos, network, IO, time skew            | Gratuito   |
| Toxiproxy      | Qualquer         | Latência, timeout, bandwidth em connections  | Gratuito   |

**Exemplo prático — Litmus ChaosEngine (Kubernetes):**

```yaml
# chaos/pod-kill-experiment.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-pod-kill
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: "app=api-gateway"
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"           # Duração: 60 segundos
            - name: CHAOS_INTERVAL
              value: "10"           # Kill a cada 10 segundos
            - name: FORCE
              value: "false"        # Graceful shutdown
            - name: PODS_AFFECTED_PERC
              value: "50"           # Mata 50% dos pods

---
# chaos/network-latency-experiment.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-network-latency
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: "app=api-gateway"
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_INTERFACE
              value: "eth0"
            - name: NETWORK_LATENCY
              value: "2000"         # 2 segundos de latência
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: DESTINATION_IPS
              value: "10.0.0.0/8"   # Latência apenas para IPs internos
```

> [!WARNING]
> **Nunca** comece chaos engineering em produção sem antes ter: observabilidade (métricas, logs, traces), alertas configurados, runbooks de incidente e buy-in do time. Comece em staging.

**Pré-requisitos antes de iniciar Chaos Engineering:**

1. Observabilidade madura (métricas, logs, traces)
2. Alertas configurados e testados
3. Runbooks de incidente documentados
4. SLOs definidos e mensuráveis
5. Capacidade de parar o experimento rapidamente (kill switch)
6. Comunicação com o time (todos sabem que o teste vai acontecer)

---

### 11. Mutation Testing

**O que é:** Introduz mutações (bugs artificiais) no código-fonte e verifica se os testes existentes detectam. Se uma mutação "sobrevive" (testes continuam passando), os testes são fracos naquele ponto.

**Quando usar:** Para avaliar a qualidade real dos testes. Coverage alto não significa testes bons — mutation testing revela isso.

**Ferramentas:**

| Ferramenta | Linguagem            | Mutações Típicas                                   |
|------------|----------------------|----------------------------------------------------|
| Stryker    | JS/TS, C#, Scala     | Trocar `>` por `>=`, remover `if`, inverter boolean|
| PIT        | Java                 | Negar condicionais, trocar operadores, remover void calls |
| mutmut     | Python               | Trocar constantes, inverter lógica, remover linhas |
| cargo-mutants | Rust              | Trocar retornos, remover expressões               |

**Exemplo prático — Stryker (JavaScript/TypeScript):**

```bash
# Instalar
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner

# Inicializar configuração
npx stryker init
```

```json
// stryker.config.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/types/**"
  ],
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "concurrency": 4,
  "timeoutMS": 10000
}
```

```bash
# Executar
npx stryker run

# Saída exemplo:
# -----------------------------------------------
# All files:     Stryker   78.5% (157/200 killed)
# -----------------------------------------------
# src/utils/price.ts   95.0%  (19/20 killed, 1 survived)
#   Mutant #14: SURVIVED
#     Mutator: ConditionalExpression
#     -  if (percentual > 100)
#     +  if (percentual >= 100)
#     → Nenhum teste cobre o caso percentual === 100
```

**Exemplo prático — mutmut (Python):**

```bash
# Instalar
pip install mutmut

# Executar mutation testing
mutmut run --paths-to-mutate=src/ --tests-dir=tests/

# Ver resultados
mutmut results

# Ver detalhes de uma mutação que sobreviveu
mutmut show 14

# Exemplo de saída:
# --- src/services/tax_calculator.py
# +++ src/services/tax_calculator.py (mutant)
# @@ -8,1 +8,1 @@
# -        return round(amount * self.RATES[state], 2)
# +        return round(amount * self.RATES[state], 3)
# → Testes não perceberam a diferença de arredondamento!
```

---

### 12. Smoke Tests (Health Checks)

**O que é:** Testes mínimos e rápidos que verificam se o sistema está "vivo" — a aplicação sobe, responde HTTP 200, conecta no banco, integrações básicas funcionam.

**Quando usar:** Imediatamente após cada deploy. Como primeiro gate antes de rodar suítes mais pesadas. Para monitoramento contínuo.

**Exemplo prático — Smoke test shell script:**

```bash
#!/bin/bash
# scripts/smoke-test.sh
set -euo pipefail

BASE_URL="${1:-https://api.example.com}"
FAILURES=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  actual_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo "✅ $name → HTTP $actual_status"
  else
    echo "❌ $name → HTTP $actual_status (esperado: $expected_status)"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "🔍 Executando smoke tests em $BASE_URL"
echo "=========================================="

check "Health Check"      "$BASE_URL/health"
check "Readiness"         "$BASE_URL/ready"
check "API - Listar"      "$BASE_URL/api/v1/products"
check "Auth - Login page" "$BASE_URL/login"
check "Docs - OpenAPI"    "$BASE_URL/docs"

echo "=========================================="
if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES teste(s) falharam. ROLLBACK recomendado."
  exit 1
else
  echo "✅ Todos os smoke tests passaram!"
  exit 0
fi
```

**Exemplo prático — Health check endpoint (Node.js):**

```javascript
// src/routes/health.js
export function healthRoutes(app, { db, redis, s3 }) {
  app.get('/health', async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (req, res) => {
    const checks = {};
    let healthy = true;

    // Banco de dados
    try {
      await db.raw('SELECT 1');
      checks.database = { status: 'ok' };
    } catch (err) {
      checks.database = { status: 'error', message: err.message };
      healthy = false;
    }

    // Redis
    try {
      await redis.ping();
      checks.redis = { status: 'ok' };
    } catch (err) {
      checks.redis = { status: 'error', message: err.message };
      healthy = false;
    }

    // S3
    try {
      await s3.headBucket({ Bucket: process.env.S3_BUCKET }).promise();
      checks.s3 = { status: 'ok' };
    } catch (err) {
      checks.s3 = { status: 'error', message: err.message };
      healthy = false;
    }

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
    });
  });
}
```

---

## Testes por Camada

### Frontend

| O que Testar                    | Como Testar                              | Ferramentas                        |
|---------------------------------|------------------------------------------|------------------------------------|
| Componentes isolados            | Renderizar e verificar output            | Vitest + Testing Library, Storybook|
| Hooks customizados              | Renderizar hook e verificar estado       | renderHook (Testing Library)       |
| Formulários e validação         | Simular input e verificar erros          | Testing Library, userEvent         |
| Estado global (store)           | Testar reducers/actions isolados         | Vitest, Jest                       |
| Rotas e navegação               | Mock de router, verificar redirecionamento| Testing Library + MemoryRouter    |
| Chamadas API                    | Mock de fetch/axios, verificar loading/error | MSW (Mock Service Worker)       |
| Acessibilidade                  | Análise automática de a11y              | axe-core, jest-axe                 |
| Regressão visual                | Screenshot comparison                    | Chromatic, Playwright              |
| Fluxos E2E do usuário           | Browser automation                       | Playwright, Cypress                |

**Exemplo — Componente React com Testing Library:**

```tsx
// src/components/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { LoginForm } from './LoginForm';

const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'user@test.com' && body.password === 'correct') {
      return HttpResponse.json({ token: 'fake-jwt-token' });
    }
    return HttpResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LoginForm', () => {
  it('deve exibir erro de validação para email vazio', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
  });

  it('deve fazer login com credenciais válidas', async () => {
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'correct');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ token: 'fake-jwt-token' });
    });
  });

  it('deve exibir mensagem de erro para credenciais inválidas', async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });
});
```

### Backend

| O que Testar                  | Como Testar                                  | Ferramentas                          |
|-------------------------------|----------------------------------------------|--------------------------------------|
| Lógica de negócio (services)  | Testes unitários com mocks de repositórios   | Jest, Vitest, PyTest, JUnit          |
| Endpoints de API              | Testar request/response HTTP                 | Supertest, httpx, WebApplicationFactory |
| Validação de input            | Enviar payloads inválidos                    | Zod, Joi, Pydantic + testes unitários|
| Autenticação/Autorização      | Testar com e sem token, roles diferentes     | Supertest + JWT helpers              |
| Queries de banco              | Integração com banco real (container)        | TestContainers, SQLite in-memory     |
| Background jobs               | Executar job e verificar side effects        | BullMQ mock, Celery eager mode       |
| Error handling                | Forçar erros e verificar respostas           | Mock de dependências com throw       |
| Rate limiting                 | Enviar requisições além do limite            | Supertest em loop                    |
| Caching                       | Verificar cache hit/miss                     | Redis TestContainer, mock            |

**Exemplo — Teste de autorização (Node.js):**

```javascript
// tests/integration/auth.test.js
describe('Autorização de endpoints', () => {
  it('deve retornar 401 sem token', async () => {
    await request.get('/api/users').expect(401);
  });

  it('deve retornar 403 para role sem permissão', async () => {
    const viewerToken = generateToken({ role: 'viewer' });
    await request
      .delete('/api/users/user-123')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('deve permitir admin deletar usuário', async () => {
    const adminToken = generateToken({ role: 'admin' });
    await request
      .delete('/api/users/user-123')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('deve rejeitar token expirado', async () => {
    const expiredToken = generateToken({ role: 'admin' }, { expiresIn: '-1h' });
    await request
      .get('/api/users')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});
```

### Infraestrutura

| O que Testar                  | Como Testar                            | Ferramentas                         |
|-------------------------------|----------------------------------------|--------------------------------------|
| IaC (Terraform/Pulumi)        | Plan + validação de recursos           | terraform validate, Checkov, tfsec  |
| Dockerfiles                   | Build + scan de vulnerabilidades       | Hadolint, Trivy, Dockle             |
| Kubernetes manifests          | Validação de YAML + policies           | kubeval, OPA/Gatekeeper, Datree     |
| Configuração de rede          | Verificar conectividade e regras       | Terratest, InSpec                   |
| Secrets management            | Verificar que secrets não estão expostos| gitleaks, detect-secrets, truffleHog|
| Compliance e policies         | Validar contra standards               | OPA, Sentinel, Checkov              |

**Exemplo — Terratest (Go):**

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "vpc_cidr":    "10.0.0.0/16",
            "environment": "test",
            "az_count":    2,
        },
    })

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    publicSubnets := terraform.OutputList(t, terraformOptions, "public_subnet_ids")
    assert.Equal(t, 2, len(publicSubnets))

    privateSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Equal(t, 2, len(privateSubnets))
}
```

**Exemplo — Checkov para Terraform:**

```bash
# Scan de segurança em arquivos Terraform
checkov -d ./terraform/ --framework terraform

# Scan de Dockerfile
checkov -f Dockerfile --framework dockerfile

# Scan de Kubernetes manifests
checkov -d ./k8s/ --framework kubernetes

# Output exemplo:
# Passed checks: 42, Failed checks: 3, Skipped checks: 0
#
# Check: CKV_AWS_79: "Ensure Instance Metadata Service Version 1 is not enabled"
#   FAILED for resource: aws_instance.web_server
#   File: /main.tf:45-67
```

### Banco de Dados

| O que Testar                    | Como Testar                                   | Ferramentas                        |
|---------------------------------|-----------------------------------------------|------------------------------------|
| Migrations (up/down)            | Rodar migration e verificar schema            | Flyway, Alembic, Knex, Prisma     |
| Integridade referencial         | Inserir dados com FKs inválidas               | TestContainers + SQL assertions    |
| Índices e performance           | EXPLAIN ANALYZE em queries críticas            | pgbench, pt-query-digest          |
| Stored procedures/functions     | Testar com dados conhecidos                   | pgTAP, utPLSQL                     |
| Rollback de migrations          | Aplicar e reverter migration                   | Migration tool + assertions        |
| Seed data                       | Verificar dados iniciais obrigatórios          | Script + assertions                |
| Backup e restore                | Automatizar backup e verificar restore         | pg_dump/pg_restore + scripts       |

**Exemplo — Teste de migration (Node.js com Knex):**

```javascript
// tests/migrations/migration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer } from 'testcontainers';
import knex from 'knex';

describe('Database Migrations', () => {
  let container;
  let db;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'migration_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    db = knex({
      client: 'pg',
      connection: {
        host: container.getHost(),
        port: container.getMappedPort(5432),
        database: 'migration_test',
        user: 'test',
        password: 'test',
      },
      migrations: { directory: './src/database/migrations' },
    });
  }, 60_000);

  afterAll(async () => {
    await db?.destroy();
    await container?.stop();
  });

  it('deve aplicar todas as migrations sem erro', async () => {
    const [batch, migrations] = await db.migrate.latest();
    expect(batch).toBeGreaterThan(0);
    expect(migrations.length).toBeGreaterThan(0);
  });

  it('deve criar tabela users com colunas corretas', async () => {
    const hasTable = await db.schema.hasTable('users');
    expect(hasTable).toBe(true);

    const columns = await db.table('users').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('email');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('created_at');
    expect(columns.email.nullable).toBe(false);
  });

  it('deve aplicar constraint unique em email', async () => {
    await db('users').insert({ name: 'A', email: 'dup@test.com' });
    await expect(
      db('users').insert({ name: 'B', email: 'dup@test.com' })
    ).rejects.toThrow(/unique/i);
  });

  it('deve reverter todas as migrations sem erro', async () => {
    await db.migrate.rollback(undefined, true);
    const hasTable = await db.schema.hasTable('users');
    expect(hasTable).toBe(false);
  });
});
```

---

## Princípios de Teste

### 1. Pirâmide de Testes

Já detalhado acima. Regra de ouro: **muitos unitários, moderados de integração, poucos E2E**. Ajuste proporções conforme o tipo do projeto.

### 2. Testes Rápidos

| Princípio                       | Como Implementar                                                |
|---------------------------------|-----------------------------------------------------------------|
| Suíte unitária < 30 segundos   | Paralelizar execução, evitar I/O real                          |
| Suíte de integração < 5 minutos| Usar containers reutilizáveis, banco in-memory quando possível |
| Suíte E2E < 15 minutos         | Paralelizar browsers, focar em fluxos críticos                 |
| Feedback no PR < 10 minutos    | Executar apenas testes afetados (`--changed`)                  |

```bash
# Vitest — rodar apenas testes afetados por mudanças
npx vitest --changed

# Jest — rodar apenas testes relacionados a arquivos modificados
npx jest --onlyChanged

# PyTest — rodar testes marcados como rápidos
pytest -m "not slow"

# Paralelizar com pytest-xdist
pytest -n auto
```

### 3. Testes Determinísticos (sem Flaky Tests)

Flaky tests são testes que passam e falham aleatoriamente. São piores que nenhum teste — erodem a confiança na suíte.

| Causa Comum               | Solução                                                      |
|----------------------------|--------------------------------------------------------------|
| Dependência de tempo       | Usar clock mock (`vi.useFakeTimers()`, `freezegun`)         |
| Ordem de execução          | Cada teste deve ser independente (setup/teardown isolado)    |
| Dados compartilhados       | Cada teste cria seus dados, limpa depois                     |
| Esperas com timeout fixo   | Usar polling/retry ou `waitFor` ao invés de `sleep`         |
| Dependência de rede        | Mock de APIs externas (MSW, WireMock)                       |
| Concorrência/race condition| Usar `waitFor`, `expect.poll`, ou serializar testes afetados|
| Estado global              | Isolar com `beforeEach`/`afterEach`, factory functions       |
| Banco de dados não limpo   | Transaction rollback por teste ou truncate tables            |

```javascript
// ❌ Flaky — depende de timing
test('deve exibir notificação após 3s', async () => {
  render(<Notification />);
  await new Promise(resolve => setTimeout(resolve, 3100));
  expect(screen.getByText('Notificação!')).toBeInTheDocument();
});

// ✅ Determinístico — usa fake timers
test('deve exibir notificação após 3s', async () => {
  vi.useFakeTimers();
  render(<Notification />);
  vi.advanceTimersByTime(3000);
  expect(screen.getByText('Notificação!')).toBeInTheDocument();
  vi.useRealTimers();
});
```

```javascript
// ❌ Flaky — depende de data real
test('deve retornar pedidos de hoje', () => {
  const orders = getOrdersForDate(new Date());
  expect(orders).toHaveLength(3); // Pode falhar amanhã
});

// ✅ Determinístico — data fixa
test('deve retornar pedidos da data especificada', () => {
  vi.setSystemTime(new Date('2025-06-15T10:00:00Z'));
  seedOrders('2025-06-15', 3);
  const orders = getOrdersForDate(new Date());
  expect(orders).toHaveLength(3);
  vi.useRealTimers();
});
```

### 4. Testar Comportamento, Não Implementação

```javascript
// ❌ Testando implementação — acoplado ao "como"
test('deve chamar repository.save', async () => {
  const mockRepo = { save: vi.fn() };
  const service = new UserService(mockRepo);
  await service.createUser({ name: 'Ana' });
  expect(mockRepo.save).toHaveBeenCalledWith({ name: 'Ana' }); // Frágil
});

// ✅ Testando comportamento — verifica o "o quê"
test('deve criar usuário e retornar com ID', async () => {
  const service = new UserService(createInMemoryRepo());
  const user = await service.createUser({ name: 'Ana' });
  expect(user).toMatchObject({ id: expect.any(String), name: 'Ana' });
});

// ✅ Testando comportamento — verifica regra de negócio
test('não deve permitir criar usuário com email duplicado', async () => {
  const service = new UserService(createInMemoryRepo());
  await service.createUser({ name: 'Ana', email: 'ana@test.com' });
  await expect(
    service.createUser({ name: 'Bia', email: 'ana@test.com' })
  ).rejects.toThrow('Email já cadastrado');
});
```

### 5. Coverage Como Guia, Não Meta

| Coverage | Interpretação                                                     |
|----------|-------------------------------------------------------------------|
| < 40%    | Risco alto — funcionalidades críticas provavelmente sem teste     |
| 40-60%   | Aceitável para projetos legados em processo de melhoria           |
| 60-80%   | Bom — cobre os caminhos principais                                |
| 80-90%   | Muito bom — pragmático e sustentável                              |
| 90-100%  | Geralmente forçado — testes de getters/setters que não agregam    |

> [!TIP]
> **80% de coverage pragmático é melhor que 100% de coverage forçado.** O último 20% frequentemente resulta em testes frágeis, de baixo valor, que testam boilerplate ou código gerado.

```bash
# Vitest — coverage com thresholds pragmáticos
# vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/types/**',        // Tipos não precisam de teste
        'src/**/index.ts',     // Re-exports
        'src/generated/**',    // Código gerado
        'src/config/**',       // Configurações simples
      ],
    },
  },
});
```

```bash
# PyTest — coverage com pytest-cov
pytest --cov=src --cov-report=html --cov-fail-under=80

# .coveragerc
[run]
source = src
omit =
    src/migrations/*
    src/config/*
    src/__main__.py
    src/**/__init__.py

[report]
fail_under = 80
exclude_lines =
    pragma: no cover
    if TYPE_CHECKING:
    if __name__ == .__main__.:
```

### 6. Testes de Segurança no CI/CD

Segurança não é uma fase separada — está embutida em todo o pipeline.

```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Commit   │────▶│   SAST   │────▶│  Build   │────▶│  DAST    │
│            │     │ Semgrep  │     │ + Scan   │     │ ZAP      │
│            │     │ CodeQL   │     │ Trivy    │     │ Nuclei   │
└────────────┘     └──────────┘     └──────────┘     └──────────┘
                        │                │                 │
                        ▼                ▼                 ▼
                   ┌──────────────────────────────────────────┐
                   │     Quality Gate — Bloqueia se:          │
                   │     • Vulnerabilidade CRITICAL/HIGH      │
                   │     • Secret detectado no código         │
                   │     • Dependência com CVE conhecida      │
                   │     • Score de segurança < threshold     │
                   └──────────────────────────────────────────┘
```

### 7. Testar o Caminho Triste

O caminho feliz (happy path) é o que todo mundo testa. O valor real está nos caminhos tristes.

| Cenário                    | Exemplo de Teste                                              |
|----------------------------|---------------------------------------------------------------|
| Input inválido             | Email malformado, campos vazios, tipos errados                |
| Timeout de serviço externo | API de pagamento não responde em 5s                           |
| Banco de dados indisponível| Connection pool exausto, query timeout                        |
| Limite de recursos         | Upload de arquivo > 10MB, lista com 100k itens                |
| Concorrência               | Dois usuários editando o mesmo recurso simultaneamente        |
| Permissão negada           | Usuário comum tentando acessar rota de admin                  |
| Dados corrompidos          | JSON malformado, UTF-8 inválido, campos null inesperados      |
| Rate limiting              | 101ª requisição no minuto                                     |
| Idempotência               | Mesmo request enviado 3 vezes                                 |
| Rollback                   | Falha no meio de uma transação com múltiplas operações        |

```javascript
// Testando caminhos tristes — exemplos
describe('Caminhos tristes', () => {
  it('deve retornar 408 quando serviço de pagamento dá timeout', async () => {
    // Mock do serviço externo com delay
    server.use(
      http.post('https://payment-api.com/charge', async () => {
        await new Promise(r => setTimeout(r, 15_000)); // Simula timeout
        return HttpResponse.json({});
      })
    );

    const response = await request.post('/api/checkout')
      .send({ items: [{ id: 'p1', qty: 1 }] })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(408);
    expect(response.body.error).toContain('timeout');
  });

  it('deve lidar com JSON malformado no body', async () => {
    const response = await request.post('/api/users')
      .set('Content-Type', 'application/json')
      .send('{ invalid json !!!');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('JSON');
  });

  it('deve ser idempotente com Idempotency-Key', async () => {
    const idempotencyKey = 'unique-key-123';

    const first = await request.post('/api/payments')
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: 100 });

    const second = await request.post('/api/payments')
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: 100 });

    expect(first.body.id).toBe(second.body.id); // Mesmo resultado
    expect(first.status).toBe(201);
    expect(second.status).toBe(200); // 200, não 201 (já existia)
  });
});
```

### 8. Padrão AAA (Arrange, Act, Assert)

Toda teste bem escrito segue o padrão AAA — três blocos claros e separados.

```javascript
// Padrão AAA explícito
test('deve aplicar cupom de desconto no carrinho', () => {
  // Arrange — preparar dados e dependências
  const cart = new ShoppingCart();
  cart.addItem({ id: 'prod-1', name: 'Camiseta', price: 79.90, quantity: 2 });
  const coupon = new Coupon({ code: 'SAVE20', discountPercent: 20 });

  // Act — executar a ação sendo testada
  cart.applyCoupon(coupon);

  // Assert — verificar o resultado
  expect(cart.totalWithDiscount).toBe(127.84);  // 159.80 - 20%
  expect(cart.appliedCoupon).toBe('SAVE20');
  expect(cart.discount).toBe(31.96);
});
```

> [!NOTE]
> Em testes simples, a separação pode ser implícita. Mas para testes complexos, use comentários `// Arrange`, `// Act`, `// Assert` para manter a clareza.

### 9. Dados de Teste: Fixtures, Factories e Builders

| Estratégia | Quando Usar                      | Vantagens                        | Desvantagens               |
|------------|----------------------------------|----------------------------------|-----------------------------|
| Fixtures   | Dados estáticos e imutáveis      | Simples, previsível              | Frágil, difícil de manter  |
| Factories  | Dados dinâmicos com defaults     | Flexível, DRY                    | Precisa configurar          |
| Builders   | Objetos complexos com muitas variações | Expressivo, legível          | Mais código inicial         |

**Exemplo — Factory (JavaScript com Fishery):**

```javascript
// tests/factories/user.factory.js
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/pt_BR';

export const userFactory = Factory.define(({ sequence }) => ({
  id: `user-${sequence}`,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'viewer',
  active: true,
  createdAt: new Date('2025-01-15T10:00:00Z'),
}));

// Uso nos testes:
const user = userFactory.build();                          // Usuário padrão
const admin = userFactory.build({ role: 'admin' });        // Sobrescrever campos
const inactiveUsers = userFactory.buildList(5, { active: false }); // Lista
```

**Exemplo — Builder Pattern (TypeScript):**

```typescript
// tests/builders/order.builder.ts
import { Order, OrderItem, OrderStatus } from '../../src/types';

export class OrderBuilder {
  private order: Partial<Order> = {
    id: 'order-001',
    customerId: 'cust-001',
    status: 'pending' as OrderStatus,
    items: [],
    createdAt: new Date('2025-06-01T10:00:00Z'),
  };

  withId(id: string) { this.order.id = id; return this; }
  withCustomer(customerId: string) { this.order.customerId = customerId; return this; }
  withStatus(status: OrderStatus) { this.order.status = status; return this; }

  withItem(item: Partial<OrderItem>) {
    this.order.items!.push({
      productId: item.productId ?? 'prod-001',
      name: item.name ?? 'Produto Teste',
      price: item.price ?? 49.90,
      quantity: item.quantity ?? 1,
    });
    return this;
  }

  confirmed() { this.order.status = 'confirmed'; return this; }
  cancelled() { this.order.status = 'cancelled'; return this; }

  build(): Order {
    return { ...this.order } as Order;
  }
}

// Uso nos testes:
const order = new OrderBuilder()
  .withCustomer('cust-456')
  .withItem({ productId: 'prod-A', price: 29.90, quantity: 3 })
  .withItem({ productId: 'prod-B', price: 59.90, quantity: 1 })
  .confirmed()
  .build();
```

**Exemplo — Factory (Python com factory_boy):**

```python
# tests/factories.py
import factory
from faker import Faker
from src.models import User, Order, OrderItem

fake = Faker('pt_BR')

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Sequence(lambda n: f"user-{n:04d}")
    name = factory.LazyFunction(fake.name)
    email = factory.LazyFunction(fake.email)
    role = "viewer"
    active = True

class OrderItemFactory(factory.Factory):
    class Meta:
        model = OrderItem

    product_id = factory.Sequence(lambda n: f"prod-{n:04d}")
    name = factory.LazyFunction(lambda: fake.commerce_product_name() if hasattr(fake, 'commerce_product_name') else "Produto Teste")
    price = factory.LazyFunction(lambda: round(fake.pyfloat(min_value=9.9, max_value=999.9), 2))
    quantity = 1

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id = factory.Sequence(lambda n: f"order-{n:04d}")
    customer = factory.SubFactory(UserFactory)
    status = "pending"

# Uso:
admin = UserFactory(role="admin")
order = OrderFactory(status="confirmed", customer__role="admin")
```

---

## Testes no CI/CD

### Ordem de Execução no Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline de Testes                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Pre-commit hooks (local)                                            │
│     ├── lint (ESLint, Ruff)                                             │
│     ├── format check (Prettier, Black)                                  │
│     └── type check (tsc, mypy)                                          │
│                                                                         │
│  2. CI — Push / Pull Request                                            │
│     ├── 2a. SAST Security Scan (Semgrep, CodeQL)        ── paralelo ──┐│
│     ├── 2b. Dependency Audit (npm audit, pip-audit)     ── paralelo ──┤│
│     ├── 2c. Testes Unitários                            ── paralelo ──┤│
│     └── 2d. Lint + Type Check                           ── paralelo ──┘│
│                                                                         │
│     ── Quality Gate 1 ──────────────────────────────────────────────── │
│     │ Coverage ≥ 80% │ Zero vulnerabilidades HIGH │ Lint pass │        │
│                                                                         │
│  3. CI — Post Unit Tests                                                │
│     ├── 3a. Testes de Integração (com TestContainers)                  │
│     ├── 3b. Testes de Contrato (Pact verify)                           │
│     └── 3c. Build + Container Image Scan (Trivy)                       │
│                                                                         │
│     ── Quality Gate 2 ──────────────────────────────────────────────── │
│     │ Integração pass │ Contratos válidos │ Zero CVE critical │        │
│                                                                         │
│  4. Deploy Staging                                                      │
│     └── 4a. Smoke Tests                                                 │
│                                                                         │
│  5. Staging — Post Deploy                                               │
│     ├── 5a. Testes E2E (Playwright)                     ── paralelo ──┐│
│     ├── 5b. DAST Security Scan (ZAP)                    ── paralelo ──┤│
│     ├── 5c. Testes de Acessibilidade (axe-core)         ── paralelo ──┤│
│     └── 5d. Visual Regression (Chromatic)               ── paralelo ──┘│
│                                                                         │
│     ── Quality Gate 3 ──────────────────────────────────────────────── │
│     │ E2E pass │ Zero vulns DAST │ A11y pass │ Visual aprovado │      │
│                                                                         │
│  6. Deploy Produção (com feature flags / canary)                        │
│     └── 6a. Smoke Tests em Produção                                     │
│                                                                         │
│  7. Pós-Deploy (agendado / periódico)                                   │
│     ├── 7a. Testes de Carga (k6) — semanal                             │
│     ├── 7b. Chaos Engineering (Litmus) — mensal                        │
│     └── 7c. Mutation Testing (Stryker) — mensal                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exemplo de Pipeline Completo (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ===== STAGE 1: Checks rápidos em paralelo =====
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: p/owasp-top-ten p/typescript p/secrets

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% está abaixo do threshold de 80%"
            exit 1
          fi
          echo "✅ Coverage: $COVERAGE%"
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm audit --audit-level=high

  # ===== STAGE 2: Integração (depende do Stage 1) =====
  integration-tests:
    needs: [lint, unit-tests, sast, dependency-audit]
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

  # ===== STAGE 3: Build + Security =====
  build:
    needs: [integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:${{ github.sha }}
          format: table
          exit-code: 1
          severity: CRITICAL,HIGH

  # ===== STAGE 4: Deploy Staging + E2E =====
  deploy-staging:
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploy to staging..."
      # ... deploy steps ...

  e2e-tests:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: https://staging.example.com
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  a11y-tests:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx pa11y-ci --config .pa11yci
        env:
          BASE_URL: https://staging.example.com

  dast:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-api-scan@v0.9.0
        with:
          target: https://staging.example.com/openapi.json
          format: openapi
```

### Quality Gates — Configuração

| Gate | Critério                                     | Fase do Pipeline | Ação se falhar |
|------|----------------------------------------------|------------------|----------------|
| 1    | Coverage ≥ 80%                               | Unit Tests       | Bloquear merge |
| 2    | Zero vulnerabilidades HIGH/CRITICAL (SAST)   | SAST             | Bloquear merge |
| 3    | Zero dependências com CVE HIGH               | Dependency Audit | Bloquear merge |
| 4    | Testes de integração 100% passando            | Integration      | Bloquear deploy|
| 5    | Container image sem CVE CRITICAL             | Build + Scan     | Bloquear deploy|
| 6    | Smoke tests passando                         | Staging Deploy   | Rollback       |
| 7    | E2E 100% passando                            | Staging          | Bloquear prod  |
| 8    | Zero violações de acessibilidade             | Staging          | Warning/Block  |
| 9    | DAST sem vulnerabilidades HIGH               | Staging          | Bloquear prod  |

---

## Checklist de Testes

### Checklist para Avaliar um Projeto Existente

Use esta checklist para diagnosticar a maturidade da estratégia de testes de qualquer projeto.

#### Infraestrutura de Testes

| # | Item                                                           | Status |
|---|----------------------------------------------------------------|--------|
| 1 | Existe um framework de testes configurado e funcionando?       | ☐      |
| 2 | Testes rodam no CI automaticamente a cada push/PR?             | ☐      |
| 3 | Coverage é medido e reportado?                                 | ☐      |
| 4 | Existe threshold mínimo de coverage configurado?               | ☐      |
| 5 | Testes falhos bloqueiam merge/deploy?                          | ☐      |
| 6 | Existe separação entre testes unitários, integração e E2E?     | ☐      |
| 7 | Testes podem ser executados localmente com um único comando?   | ☐      |
| 8 | Existe documentação de como rodar os testes?                   | ☐      |

#### Qualidade dos Testes

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 9  | Testes são determinísticos (sem flaky tests)?                 | ☐      |
| 10 | Testes seguem o padrão AAA (Arrange, Act, Assert)?            | ☐      |
| 11 | Testes são independentes (não dependem de ordem)?             | ☐      |
| 12 | Caminhos tristes são testados (erros, edge cases)?            | ☐      |
| 13 | Testes usam factories/builders (não dados hardcoded frágeis)? | ☐      |
| 14 | Testes testam comportamento, não implementação?               | ☐      |
| 15 | Suíte de testes executa em tempo razoável (< 15min total)?    | ☐      |

#### Cobertura por Camada

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 16 | Lógica de negócio tem testes unitários?                       | ☐      |
| 17 | APIs/endpoints têm testes de integração?                      | ☐      |
| 18 | Fluxos críticos de usuário têm testes E2E?                    | ☐      |
| 19 | Validações de input são testadas?                             | ☐      |
| 20 | Autenticação e autorização são testadas?                      | ☐      |
| 21 | Migrations de banco são testadas (up e down)?                 | ☐      |
| 22 | Error handling é testado (timeouts, 500s, dados inválidos)?   | ☐      |

#### Segurança

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 23 | SAST roda no CI (SonarQube, Semgrep, CodeQL)?                | ☐      |
| 24 | Dependências são auditadas (npm audit, pip-audit)?            | ☐      |
| 25 | Container images são escaneadas (Trivy)?                      | ☐      |
| 26 | Secrets não estão hardcoded (gitleaks, detect-secrets)?       | ☐      |
| 27 | DAST roda em staging (ZAP)?                                   | ☐      |
| 28 | Headers de segurança são verificados?                         | ☐      |

#### Performance e Resiliência

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 29 | Testes de carga existem para endpoints críticos?              | ☐      |
| 30 | SLAs de latência são validados (p95, p99)?                    | ☐      |
| 31 | Circuit breakers e retries são testados?                      | ☐      |
| 32 | Degradação graciosa é testada (fallbacks)?                    | ☐      |

#### UX e Acessibilidade

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 33 | Testes de acessibilidade rodam no CI?                         | ☐      |
| 34 | Regressão visual é monitorada?                                | ☐      |
| 35 | Responsividade é testada (múltiplos viewports)?               | ☐      |

#### Práticas Avançadas

| #  | Item                                                          | Status |
|----|---------------------------------------------------------------|--------|
| 36 | Testes de contrato existem (em arquitetura de microsserviços)?| ☐      |
| 37 | Mutation testing é executado periodicamente?                  | ☐      |
| 38 | Chaos engineering é praticado em staging/produção?            | ☐      |
| 39 | Smoke tests rodam após cada deploy em produção?               | ☐      |
| 40 | Existe monitoramento sintético (testes em produção)?          | ☐      |

### Pontuação e Maturidade

| Nível        | Score (de 40) | Descrição                                                  |
|--------------|---------------|--------------------------------------------------------------|
| 🔴 Crítico   | 0-10          | Risco alto. Foco: configurar CI, testes unitários básicos   |
| 🟠 Inicial   | 11-20         | Básico existe. Foco: integração, cobertura, segurança       |
| 🟡 Definido  | 21-30         | Boa base. Foco: E2E, performance, acessibilidade           |
| 🟢 Gerenciado| 31-35         | Maduro. Foco: chaos engineering, mutation testing           |
| 🔵 Otimizado | 36-40         | Excelente. Foco: manutenção e melhoria contínua            |

---

## Referências Rápidas

### Comandos Comuns por Ferramenta

```bash
# === JavaScript/TypeScript ===
npx vitest                          # Rodar testes (watch mode)
npx vitest run                      # Rodar uma vez
npx vitest run --coverage           # Com coverage
npx vitest run --changed            # Apenas alterados
npx jest --runInBand                # Jest sequencial (debug)
npx playwright test                 # E2E com Playwright
npx playwright test --ui            # Playwright com UI
npx playwright show-report          # Ver relatório

# === Python ===
pytest                              # Rodar testes
pytest -v                           # Verbose
pytest --cov=src --cov-report=html  # Com coverage
pytest -n auto                      # Paralelo (pytest-xdist)
pytest -k "test_checkout"           # Filtrar por nome
pytest -m "not slow"                # Excluir marcados como slow
mutmut run                          # Mutation testing

# === Java ===
mvn test                            # Unitários
mvn verify                          # Unitários + integração
mvn test -pl module-name            # Testar módulo específico
mvn pitest:mutationCoverage         # Mutation testing (PIT)

# === .NET ===
dotnet test                         # Rodar testes
dotnet test --collect:"XPlat Code Coverage"  # Com coverage
dotnet test --filter "Category=Unit"         # Filtrar por categoria

# === Go ===
go test ./...                       # Todos os testes
go test -v ./...                    # Verbose
go test -cover ./...                # Com coverage
go test -race ./...                 # Race condition detector
go test -bench=. ./...              # Benchmarks

# === Performance ===
k6 run load-tests/scenario.js      # k6
locust -f locustfile.py             # Locust (abre web UI)
artillery run scenario.yml          # Artillery

# === Segurança ===
semgrep --config=auto .             # SAST
trivy image myapp:latest            # Container scan
gitleaks detect                     # Secrets scan
npx pa11y-ci                        # Acessibilidade
```
