# Critérios de Avaliação de Stack Tecnológica

> Guia estruturado para avaliação, comparação e tomada de decisão sobre tecnologias em projetos de software.

---

## Matriz de Avaliação

Cada critério recebe uma nota de **1 a 5** e um peso sugerido. A pontuação final é calculada como `Σ(nota × peso)`.

| Critério | Peso Sugerido | O que Avaliar | Como Medir |
|---|---|---|---|
| **Maturidade e Estabilidade** | 9 | Tempo de existência, versão atual (>= 1.0?), frequência de releases, histórico de breaking changes, adoção por empresas grandes | Verificar data do primeiro release, changelog, quem usa em produção (ex: Next.js — v14, usado por Netflix, Twitch) |
| **Comunidade** | 8 | Tamanho e atividade da comunidade, quantidade de perguntas no Stack Overflow, GitHub stars/forks/issues, presença em fóruns e Discord/Slack | GitHub stars > 10k é bom sinal; verificar ratio issues abertas vs fechadas; tags ativas no Stack Overflow |
| **Documentação** | 9 | Qualidade, completude, atualização, exemplos funcionais, tutoriais oficiais, guias de migração, API reference | Testar os exemplos da documentação — eles funcionam? Última atualização da doc é recente? Existe seção de troubleshooting? |
| **Ecossistema** | 8 | Bibliotecas complementares, plugins, integrações com ferramentas populares (CI/CD, IDEs, cloud providers), middleware disponível | Contar pacotes no npm/PyPI/Maven; verificar integrações oficiais com AWS/GCP/Azure; plugins para VS Code/IntelliJ |
| **Performance** | 7 | Benchmarks independentes, throughput, latência, consumo de memória/CPU, tempo de cold start, tamanho do bundle | Consultar TechEmpower Benchmarks, benchmarks do GitHub (ex: `the-benchmarker`), rodar teste local com `wrk` ou `k6` |
| **Segurança** | 9 | CVEs conhecidos e corrigidos, frequência de patches de segurança, conformidade OWASP, audit trail, suporte a autenticação/autorização nativa | Verificar no NVD (nvd.nist.gov), Snyk Vulnerability DB, GitHub Security Advisories; tempo médio de correção de CVEs |
| **Escalabilidade** | 7 | Suporte a escala horizontal e vertical, limites conhecidos, clustering nativo, suporte a containers/Kubernetes, arquitetura stateless | Documentação oficial sobre limites; case studies de empresas em escala; suporte nativo a load balancing |
| **Curva de Aprendizado** | 6 | Tempo para um dev júnior ser produtivo, quantidade de conceitos novos, similaridade com tecnologias conhecidas pela equipe | Estimar dias até o primeiro PR produtivo; quantidade de conceitos fundamentais para dominar (ex: React — JSX, hooks, state, effects = 4 conceitos core) |
| **Custo** | 8 | Licenciamento (open source? freemium? enterprise?), custo de hospedagem, custo de desenvolvimento (horas), custo de migração | Comparar planos de pricing; calcular TCO em 12 e 36 meses; incluir custo de treinamento da equipe |
| **Contratação** | 7 | Facilidade de encontrar desenvolvedores no mercado, salário médio, presença em currículos, cursos disponíveis | Pesquisar vagas no LinkedIn/Glassdoor; verificar pesquisas como Stack Overflow Survey e JetBrains Developer Survey |
| **Testabilidade** | 7 | Facilidade de escrever testes unitários/integração/e2e, ferramentas de teste disponíveis, mocking, cobertura | Verificar frameworks de teste nativos ou recomendados; suporte a test runners populares (Jest, Pytest, JUnit); facilidade de mockar dependências |
| **Manutenibilidade** | 8 | Legibilidade do código, padrões estabelecidos, linters e formatters disponíveis, type safety, refactoring tools | Existem linters oficiais? (ESLint, Pylint, RuboCop); suporte a tipagem estática? Ferramentas de refactoring no IDE? |
| **Compatibilidade** | 7 | Integração com a stack atual do projeto, compatibilidade com infraestrutura existente, interoperabilidade com APIs e serviços já em uso | Testar integração real com o stack existente; verificar se há adaptadores/conectores oficiais; compatibilidade de versões |

### Escala de Notas

| Nota | Significado | Descrição |
|---|---|---|
| **1** | Crítico | Não atende ao requisito mínimo, risco alto |
| **2** | Fraco | Atende parcialmente, com limitações significativas |
| **3** | Adequado | Atende ao necessário, sem diferencial |
| **4** | Bom | Atende bem, com diferenciais relevantes |
| **5** | Excelente | Referência no mercado para este critério |

### Pontuação Máxima Possível

Com os pesos sugeridos, a pontuação máxima é **`500`** (100 de peso total × 5 de nota máxima).

| Faixa de Pontuação | Classificação | Recomendação |
|---|---|---|
| 400–500 | Excelente | Recomendação forte |
| 300–399 | Boa | Recomendação com ressalvas menores |
| 200–299 | Aceitável | Avaliar alternativas antes de decidir |
| 100–199 | Fraca | Não recomendada sem justificativa forte |
| < 100 | Crítica | Evitar |

---

## Perguntas-Chave para Cada Tecnologia

Antes de recomendar qualquer tecnologia, o consultor deve responder **todas** as perguntas abaixo:

### Sobre o Projeto

1. **Qual o tipo do projeto?** (MVP, produto maduro, migração, refatoração, novo módulo)
2. **Qual o prazo e orçamento disponíveis?**
3. **Qual o tamanho e senioridade da equipe?**
4. **Quais tecnologias a equipe já domina?**
5. **Qual a expectativa de vida útil do projeto?** (6 meses? 5 anos? 10 anos?)
6. **Quais são os requisitos não-funcionais críticos?** (latência, throughput, disponibilidade, compliance)

### Sobre a Tecnologia

7. **Essa tecnologia resolve um problema que a stack atual não resolve?** Se sim, qual exatamente?
8. **Existe uma alternativa mais simples que resolva o mesmo problema?**
9. **Qual a versão atual e quando foi o último release?**
10. **Quem mantém essa tecnologia?** (empresa, fundação, comunidade, indivíduo)
11. **Qual o modelo de licenciamento?** (MIT, Apache 2.0, GPL, SSPL, proprietária)
12. **A licença mudou recentemente ou há risco de mudar?** (ex: Redis → SSPL, Elasticsearch → SSPL, HashiCorp → BSL)
13. **Existem casos de uso documentados em produção com escala similar à do projeto?**
14. **A tecnologia é compatível com a infraestrutura existente?** (cloud provider, CI/CD, monitoramento)
15. **Qual o plano de fallback se a tecnologia não funcionar?** Qual o custo de reverter?

### Sobre Riscos

16. **O que acontece se o principal mantenedor abandonar o projeto?**
17. **Existem CVEs não corrigidos?**
18. **A tecnologia tem vendor lock-in?** Qual o custo de saída?
19. **Existem limitações de escala conhecidas e documentadas?**
20. **O que a comunidade diz sobre a tecnologia?** (Reddit, HackerNews, Twitter/X — buscar críticas reais)

---

## Red Flags 🚩

Sinais de alerta que indicam que uma tecnologia deve ser avaliada com **extrema cautela** ou **evitada**:

### Manutenção e Governança

| Red Flag | Detalhe | Severidade |
|---|---|---|
| Último release há mais de 12 meses | Projeto possivelmente abandonado ou em modo de manutenção passiva | 🔴 Alta |
| Menos de 3 contributors ativos | Risco de bus factor crítico | 🔴 Alta |
| Dependência de um único mantenedor | Se sair, o projeto morre (ex: event-stream incident, left-pad) | 🔴 Alta |
| Sem roadmap público | Sem visibilidade sobre a direção futura | 🟡 Média |
| Issues abertas sem resposta há mais de 30 dias | Comunidade não responsiva ou sobrecarregada | 🟡 Média |
| PRs legítimos ignorados por meses | Mantenedores não engajados | 🟡 Média |

### Segurança

| Red Flag | Detalhe | Severidade |
|---|---|---|
| CVEs críticos sem patch | Vulnerabilidade conhecida sem correção disponível | 🔴 Alta |
| Sem política de segurança (`SECURITY.md`) | Não há processo para reportar vulnerabilidades | 🟡 Média |
| Dependências com vulnerabilidades conhecidas | Cadeia de dependências comprometida | 🔴 Alta |
| Sem suporte a versões anteriores (backports) | Forçado a atualizar para versão major para receber fix de segurança | 🟡 Média |

### Estabilidade

| Red Flag | Detalhe | Severidade |
|---|---|---|
| Breaking changes em versões minor/patch | Não segue semver corretamente | 🔴 Alta |
| Documentação desatualizada (exemplos não funcionam) | Custo alto de onboarding e debugging | 🟡 Média |
| API instável em versão < 1.0 | Esperar maturidade antes de adotar em produção | 🟡 Média |
| Mudança recente de licença | Risco jurídico e operacional (verificar implicações) | 🔴 Alta |
| Hype sem adoção em produção | Muitos stars no GitHub, mas poucos case studies reais | 🟡 Média |

### Ecossistema

| Red Flag | Detalhe | Severidade |
|---|---|---|
| Sem integrações com ferramentas populares | Vai exigir desenvolvimento customizado | 🟡 Média |
| Vendor lock-in severo | Custo de migração proibitivo se precisar trocar | 🔴 Alta |
| Pacotes core mantidos por terceiros não confiáveis | Risco de supply chain attack | 🔴 Alta |

---

## Green Flags ✅

Sinais de que uma tecnologia é **confiável e recomendável**:

### Manutenção e Governança

| Green Flag | Detalhe |
|---|---|
| Releases regulares (mensal ou trimestral) | Projeto ativo e bem mantido |
| Mantido por fundação ou empresa estável | Ex: Linux Foundation, Apache Foundation, Google, Microsoft, Vercel |
| Mais de 10 contributors ativos | Bus factor saudável |
| Roadmap público e transparente | Previsibilidade sobre a evolução |
| Changelog detalhado e semver respeitado | Atualizações seguras e previsíveis |
| Processo de RFC para mudanças grandes | Comunidade participa das decisões |
| Código de conduta e guia de contribuição | Comunidade organizada e inclusiva |

### Segurança

| Green Flag | Detalhe |
|---|---|
| Política de segurança publicada (`SECURITY.md`) | Processo claro para reportar e corrigir vulnerabilidades |
| Tempo médio de correção de CVE < 30 dias | Respostas rápidas a problemas de segurança |
| Auditorias de segurança públicas | Transparência sobre a postura de segurança |
| Suporte a LTS (Long Term Support) | Patches de segurança para versões anteriores |
| Programa de bug bounty | Incentivo à descoberta responsável de vulnerabilidades |

### Ecossistema e Comunidade

| Green Flag | Detalhe |
|---|---|
| Documentação excelente com exemplos funcionais | Baixo custo de onboarding |
| Stack Overflow com muitas perguntas respondidas | Fácil encontrar ajuda |
| Integrações oficiais com cloud providers | AWS, GCP, Azure oferecem suporte nativo |
| Plugins/extensões para IDEs populares | VS Code, IntelliJ, Vim/Neovim com suporte |
| Ecossistema de testes maduro | Frameworks de teste bem estabelecidos |
| Cursos e tutoriais abundantes | Udemy, YouTube, documentação oficial com learning paths |
| Adoção por empresas grandes e conhecidas | Validação em escala de produção real |

### Técnico

| Green Flag | Detalhe |
|---|---|
| Tipagem estática ou suporte a tipos | Menos bugs em produção, melhor refactoring |
| Performance documentada com benchmarks | Decisão baseada em dados, não em hype |
| Suporte nativo a containers e Kubernetes | Pronto para ambientes cloud-native |
| Backward compatibility respeitada | Migrações suaves entre versões |
| Ferramentas de migração oficiais (codemods) | Facilita upgrades de versão |

---

## Template de Comparação

### Tabela de Comparação Rápida

Copie e preencha esta tabela para comparar até 3 tecnologias:

```
┌───────────────────────┬────────┬────────┬────────┬────────┐
│ Critério              │  Peso  │ Tech A │ Tech B │ Tech C │
├───────────────────────┼────────┼────────┼────────┼────────┤
│ Maturidade            │    9   │   /5   │   /5   │   /5   │
│ Comunidade            │    8   │   /5   │   /5   │   /5   │
│ Documentação          │    9   │   /5   │   /5   │   /5   │
│ Ecossistema           │    8   │   /5   │   /5   │   /5   │
│ Performance           │    7   │   /5   │   /5   │   /5   │
│ Segurança             │    9   │   /5   │   /5   │   /5   │
│ Escalabilidade        │    7   │   /5   │   /5   │   /5   │
│ Curva de Aprendizado  │    6   │   /5   │   /5   │   /5   │
│ Custo                 │    8   │   /5   │   /5   │   /5   │
│ Contratação           │    7   │   /5   │   /5   │   /5   │
│ Testabilidade         │    7   │   /5   │   /5   │   /5   │
│ Manutenibilidade      │    8   │   /5   │   /5   │   /5   │
│ Compatibilidade       │    7   │   /5   │   /5   │   /5   │
├───────────────────────┼────────┼────────┼────────┼────────┤
│ TOTAL PONDERADO       │  100   │  /500  │  /500  │  /500  │
│ CLASSIFICAÇÃO         │   —    │        │        │        │
│ RECOMENDAÇÃO          │   —    │        │        │        │
└───────────────────────┴────────┴────────┴────────┴────────┘
```

### Exemplo Preenchido: Framework Web Backend

```
┌───────────────────────┬────────┬─────────────┬─────────────┬─────────────┐
│ Critério              │  Peso  │  FastAPI     │  Express.js │  Spring Boot│
├───────────────────────┼────────┼─────────────┼─────────────┼─────────────┤
│ Maturidade            │    9   │  4 (2018)   │  5 (2010)   │  5 (2014)   │
│ Comunidade            │    8   │  4 (68k★)   │  5 (63k★)   │  5 (72k★)   │
│ Documentação          │    9   │  5          │  4          │  5          │
│ Ecossistema           │    8   │  4          │  5          │  5          │
│ Performance           │    7   │  5          │  3          │  4          │
│ Segurança             │    9   │  4          │  3          │  5          │
│ Escalabilidade        │    7   │  4          │  4          │  5          │
│ Curva de Aprendizado  │    6   │  5          │  5          │  3          │
│ Custo                 │    8   │  5          │  5          │  4          │
│ Contratação           │    7   │  3          │  5          │  5          │
│ Testabilidade         │    7   │  5          │  4          │  5          │
│ Manutenibilidade      │    8   │  5          │  3          │  5          │
│ Compatibilidade       │    7   │  4          │  4          │  4          │
├───────────────────────┼────────┼─────────────┼─────────────┼─────────────┤
│ TOTAL PONDERADO       │  100   │    434      │    410      │    462      │
│ CLASSIFICAÇÃO         │   —    │   Excelente │   Excelente │   Excelente │
│ RECOMENDAÇÃO          │   —    │   Python    │   Node.js   │   Java/     │
│                       │        │   teams     │   fullstack │   Enterprise│
└───────────────────────┴────────┴─────────────┴─────────────┴─────────────┘
```

### Ficha Técnica Individual

Para cada tecnologia avaliada, preencha também esta ficha:

```
╔══════════════════════════════════════════════════════════════╗
║ FICHA TÉCNICA: [Nome da Tecnologia]                         ║
╠══════════════════════════════════════════════════════════════╣
║ Categoria:        [Framework Web / Banco de Dados / etc.]   ║
║ Versão Atual:     [ex: v14.2.3]                             ║
║ Primeiro Release: [ex: 2018]                                ║
║ Licença:          [ex: MIT]                                 ║
║ Mantenedor:       [ex: Vercel / Apache Foundation]          ║
║ Linguagem:        [ex: Python 3.8+]                         ║
║ GitHub Stars:     [ex: 68.000]                              ║
║ Último Release:   [ex: 2026-05-15]                          ║
║ Ciclo de Release: [ex: Mensal]                              ║
║ LTS Disponível:   [Sim/Não]                                 ║
╠══════════════════════════════════════════════════════════════╣
║ PRÓS:                                                       ║
║ • [pró 1]                                                   ║
║ • [pró 2]                                                   ║
║ • [pró 3]                                                   ║
╠══════════════════════════════════════════════════════════════╣
║ CONTRAS:                                                    ║
║ • [contra 1]                                                ║
║ • [contra 2]                                                ║
║ • [contra 3]                                                ║
╠══════════════════════════════════════════════════════════════╣
║ IDEAL PARA:                                                 ║
║ [Descrever o cenário ideal de uso]                          ║
╠══════════════════════════════════════════════════════════════╣
║ EVITAR QUANDO:                                              ║
║ [Descrever cenários onde NÃO é recomendada]                 ║
╠══════════════════════════════════════════════════════════════╣
║ EMPRESAS QUE USAM:                                          ║
║ [Listar 3-5 empresas conhecidas]                            ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Quando NÃO Trocar de Tecnologia

> [!IMPORTANT]
> A decisão padrão deve ser **manter** a tecnologia atual. A troca só se justifica quando os benefícios superam claramente os custos e riscos.

### Critérios para Manter a Tecnologia Atual

**1. O sistema está funcionando e atendendo aos requisitos de negócio**
- A tecnologia atual entrega o que é necessário em termos de funcionalidade
- Os SLAs estão sendo cumpridos (uptime, latência, throughput)
- Não há incidentes recorrentes causados pela tecnologia em si

**2. A equipe é produtiva com a tecnologia atual**
- Os desenvolvedores conhecem bem a stack e entregam com velocidade adequada
- O tempo de onboarding de novos membros é aceitável
- A equipe não tem dificuldades sistêmicas com a tecnologia

**3. O custo de migração é desproporcional ao benefício**
- Calcular: `Custo de Migração = (horas de dev × custo/hora) + risco de bugs + downtime + retreinamento`
- Se o custo de migração > 30% do orçamento anual do projeto → não justifica
- Se a migração leva > 6 meses → reavaliar se o benefício compensa

**4. A tecnologia ainda recebe atualizações de segurança**
- Patches de segurança são lançados regularmente
- A versão em uso ainda está dentro do ciclo de suporte (LTS ou equivalente)

**5. O problema pode ser resolvido sem trocar de tecnologia**
- Otimizações de configuração
- Atualização de versão (minor/major) da mesma tecnologia
- Adição de camada complementar (cache, CDN, queue)
- Refatoração do código, não da tecnologia

**6. A motivação principal é "hype" ou preferência pessoal**
- "Todo mundo está usando X" não é justificativa técnica
- "Y é mais moderno" não é justificativa técnica
- "Eu quero aprender Z" não é justificativa técnica
- A decisão deve ser baseada em **dados e requisitos**, não em tendências

### Checklist Anti-Migração Prematura

Antes de propor uma troca, confirme que **nenhuma** destas afirmações é verdadeira:

- [ ] A tecnologia atual resolve o problema de negócio adequadamente
- [ ] A equipe é produtiva e não tem bloqueios técnicos sistêmicos
- [ ] O sistema atende aos requisitos não-funcionais (performance, segurança, disponibilidade)
- [ ] A tecnologia ainda está em suporte ativo com patches de segurança
- [ ] O problema identificado pode ser resolvido com otimização ou atualização de versão
- [ ] Não há prazo ou orçamento realista para a migração
- [ ] A equipe não tem experiência na tecnologia proposta

> Se **qualquer item** acima for verdadeiro, a troca provavelmente **não** se justifica neste momento.

---

## Quando Trocar de Tecnologia

### Critérios Justificáveis para Migração

**1. End of Life (EOL) confirmado**
- A tecnologia atingiu ou vai atingir EOL em menos de 12 meses
- Sem patches de segurança futuros
- Exemplos reais: Python 2 (EOL jan/2020), AngularJS (EOL dez/2021), CentOS 8 (EOL dez/2021)

**2. Vulnerabilidades de segurança não corrigidas**
- CVEs críticos (CVSS ≥ 9.0) sem patch disponível
- Mantenedores não respondem a reports de segurança
- A tecnologia não tem processo de resposta a incidentes de segurança

**3. Limitações técnicas comprovadas que impedem o crescimento**
- A tecnologia não escala para a demanda atual/projetada (comprovado por benchmarks, não por suposição)
- Limitações arquiteturais que não podem ser contornadas
- Exemplos: monolito que precisa de escala horizontal independente por módulo, banco relacional que não suporta o volume de writes

**4. Custo operacional insustentável**
- Custo de licenciamento que cresce desproporcionalmente ao valor entregue
- Custo de infraestrutura significativamente maior que alternativas (comprovado por PoC)
- Custo de manutenção/suporte que consome > 40% do tempo da equipe

**5. Impossibilidade de contratar profissionais**
- Tecnologia tão nicho que não há candidatos disponíveis no mercado
- Salários exigidos são incompatíveis com o orçamento do projeto
- A equipe atual está concentrada em 1-2 pessoas sem backup (risco de bus factor)

**6. Mudança de licenciamento desfavorável**
- A licença mudou de open source para source-available ou proprietária
- As novas condições são incompatíveis com o modelo de negócio
- Exemplos: Redis (SSPL), Elasticsearch (SSPL), Terraform (BSL)

**7. Degradação comprovada de performance ou confiabilidade**
- Incidentes recorrentes causados diretamente pela tecnologia (não por mau uso)
- Métricas de performance degradando consistentemente ao longo do tempo
- Workarounds acumulados que aumentam a complexidade exponencialmente

### Processo de Decisão para Migração

```
┌─────────────────────────────────────────────┐
│ 1. IDENTIFICAR O PROBLEMA                  │
│    • Qual problema exato a troca resolve?   │
│    • O problema é da tecnologia ou do uso?  │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│ 2. QUANTIFICAR O IMPACTO                   │
│    • Custo atual do problema ($/mês)        │
│    • Risco se não resolver (probabilidade)  │
│    • Impacto no negócio (receita, clientes) │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│ 3. AVALIAR ALTERNATIVAS                    │
│    • Otimização da tech atual               │
│    • Atualização de versão                  │
│    • Camada complementar                    │
│    • Migração parcial vs total              │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│ 4. PROOF OF CONCEPT (PoC)                  │
│    • Implementar cenário real (não toy)     │
│    • Medir performance com dados reais      │
│    • Testar integração com stack existente  │
│    • Envolver a equipe que vai manter       │
│    • Duração recomendada: 2-4 semanas       │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│ 5. CALCULAR TCO (Total Cost of Ownership)  │
│    • Custo de migração (horas × valor/hora) │
│    • Custo de retreinamento da equipe       │
│    • Custo de downtime durante migração     │
│    • Custo operacional pós-migração (12m)   │
│    • Custo de manter dois sistemas em       │
│      paralelo durante a transição           │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│ 6. DECISÃO FINAL                            │
│    • Benefício líquido > 0 em 12-18 meses?  │
│    • Risco de não migrar > risco de migrar? │
│    • A equipe apoia a decisão?              │
│    • Existe janela de tempo viável?         │
│    • Há plano de rollback?                  │
└─────────────────────────────────────────────┘
```

### Estratégias de Migração

| Estratégia | Descrição | Quando Usar | Risco |
|---|---|---|---|
| **Big Bang** | Substitui tudo de uma vez | Sistemas pequenos, equipes pequenas, prazo curto | 🔴 Alto |
| **Strangler Fig** | Substitui incrementalmente, funcionalidade por funcionalidade | Sistemas grandes, monolitos, migração para microsserviços | 🟢 Baixo |
| **Parallel Run** | Roda os dois sistemas simultaneamente e compara resultados | Sistemas críticos, financeiros, onde a correção é vital | 🟡 Médio (custo alto) |
| **Blue-Green** | Dois ambientes idênticos, alterna tráfego | Migração de infraestrutura, zero-downtime necessário | 🟡 Médio |
| **Feature Flags** | Ativa a nova tecnologia gradualmente por % de usuários | Quando precisa validar em produção com risco controlado | 🟢 Baixo |

---

## Fontes para Pesquisa e Validação

Use estas fontes concretas para embasar avaliações:

| Fonte | URL | O que Consultar |
|---|---|---|
| Stack Overflow Survey | survey.stackoverflow.co | Popularidade, satisfação, tendências |
| JetBrains Dev Survey | jetbrains.com/lp/devecosystem | Uso por linguagem, framework, ferramentas |
| GitHub Trending | github.com/trending | Projetos em ascensão |
| ThoughtWorks Radar | thoughtworks.com/radar | Classificação Adopt/Trial/Assess/Hold |
| TechEmpower Benchmarks | techempower.com/benchmarks | Benchmarks de frameworks web |
| NVD (NIST) | nvd.nist.gov | CVEs e vulnerabilidades |
| Snyk Vulnerability DB | snyk.io/vuln | Vulnerabilidades em pacotes |
| CNCF Landscape | landscape.cncf.io | Ecossistema cloud-native |
| npm trends | npmtrends.com | Comparação de downloads npm |
| PyPI Stats | pypistats.org | Downloads de pacotes Python |
| DB-Engines Ranking | db-engines.com/en/ranking | Popularidade de bancos de dados |
| TIOBE Index | tiobe.com/tiobe-index | Popularidade de linguagens |
| Glassdoor / LinkedIn | glassdoor.com / linkedin.com | Mercado de trabalho e salários |
| Reddit (r/programming, r/webdev) | reddit.com | Opiniões reais da comunidade |
| HackerNews | news.ycombinator.com | Discussões técnicas aprofundadas |

---

## Resumo Executivo para Stakeholders

Ao apresentar uma recomendação de tecnologia para stakeholders não-técnicos, use este formato:

```
╔══════════════════════════════════════════════════════════════╗
║ RECOMENDAÇÃO DE TECNOLOGIA — RESUMO EXECUTIVO               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ PROBLEMA:                                                    ║
║ [Descrever o problema de negócio em 2-3 frases]             ║
║                                                              ║
║ TECNOLOGIA RECOMENDADA:                                      ║
║ [Nome] — [uma frase descritiva]                              ║
║                                                              ║
║ POR QUE ESTA E NÃO OUTRA:                                   ║
║ • [Razão 1 — focada em resultado de negócio]                ║
║ • [Razão 2 — focada em custo ou prazo]                      ║
║ • [Razão 3 — focada em risco]                               ║
║                                                              ║
║ CUSTO ESTIMADO:                                              ║
║ • Implementação: R$ [valor] / [X] semanas                   ║
║ • Operação mensal: R$ [valor]/mês                           ║
║ • Treinamento: R$ [valor] / [X] dias                        ║
║                                                              ║
║ RISCOS:                                                      ║
║ • [Risco 1 — com mitigação]                                 ║
║ • [Risco 2 — com mitigação]                                 ║
║                                                              ║
║ PRAZO:                                                       ║
║ [X] semanas para MVP / [Y] meses para produção              ║
║                                                              ║
║ ALTERNATIVAS CONSIDERADAS:                                   ║
║ • [Tech B] — descartada porque [motivo]                     ║
║ • [Tech C] — descartada porque [motivo]                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```
