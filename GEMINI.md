# GEMINI.md - Documentação e Estado do Projeto: Sistema Crisma

Este documento tem como objetivo servir de referência rápida e completa para LLMs (e desenvolvedores) sobre a finalidade, arquitetura, funcionalidades e estado atual do projeto **Sistema Crisma - Santuário Mãe Rainha**.

---

## 📌 Visão Geral do Projeto

O **Sistema Crisma** é uma aplicação web voltada para a gestão financeira e de contribuições mensais dos crismandos da turma de **Crisma de Adultos do Santuário Mãe Rainha** (Igreja Católica Apostólica Romana).

- **Objetivo**: Facilitar o cadastro de crismandos, o registro e controle de contribuições mensais, a geração de comprovantes digitais (PNG), a comunicação direta via WhatsApp e a geração de relatórios exportáveis em Excel.
- **Tipo de Aplicação**: Web Single-Page Application (SPA) responsiva.
- **Público-alvo**: Coordenadores e organizadores da catequese de crisma.

---

## 🛠️ Arquitetura e Tecnologias

- **Frontend**: HTML5, Vanilla CSS (`css/styles.css`), Vanilla JavaScript (modularizado sem frameworks pesados).
- **Backend / Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL cloud acessado via SDK JavaScript Client v2).
- **Bibliotecas Externas**:
  - `@supabase/supabase-js@2` (CDN) — Comunicação com o banco Supabase.
  - `xlsx` (SheetJS via cdnjs) — Exportação de dados para relatórios em Excel (`.xlsx`).
- **Autenticação**: Sistema customizado client-side (`auth.js`) com criptografia de senha via `Web Crypto API` (SHA-256), controle de sessão via `localStorage` (timeout de 30min) e limitação de tentativas no Supabase.

---

## 📁 Estrutura de Arquivos e Responsabilidades

```
c:\ProjectsCode\sistema-crisma\
├── index.html                  # Interface gráfica principal e estruturação dos módulos
├── auth.js                     # Classe AuthSystem: Login, hash SHA-256, gerenciamento de sessão e bloqueio
├── env.js                      # Variáveis de ambiente (SUPABASE_URL e SUPABASE_ANON_KEY)
├── package.json                # Configuração do projeto Node / Ferramentas de ofuscação e build
├── README.md                   # Resumo rápido e instrução de uso
├── GEMINI.md                   # Documentação detalhada da arquitetura, funcionalidades e estado do projeto
├── assets/
│   └── mae rainha-1.png        # Logomarca oficial do Santuário Mãe Rainha
├── css/
│   └── styles.css              # Estilização global da aplicação (Cores, grids, botões, modais)
├── js/
│   ├── app.js                  # Inicialização da aplicação (DOMContentLoaded, verificação de auth e eventos)
│   ├── supabase-config.js      # Inicialização do cliente Supabase e teste de conexão
│   ├── data.js                 # Manipulação de estado e dados (Crismandos, pagamentos paginados via .range(), códigos de autenticação)
│   ├── comprovante.js          # Geração de comprovante visual em Canvas (PNG), lógica de envio WhatsApp e detecção de dispositivos (iOS/Android/Desktop)
│   └── utils.js                # Funções utilitárias, calculadoras de relatórios, exportação Excel, autocomplete e validações
└── .agent/
    └── skill/
        └── consultor-tecnico/  # Skill de consultoria técnica para arquitetura, segurança e boas práticas
```

---

## ⚡ Funcionalidades Implementadas

### 1. Autenticação e Segurança
- Tela de login protegida por senha.
- Hash SHA-256 para senhas antes da verificação.
- Tabela Supabase associada: `usuarios_autenticados`.
- Bloqueio temporário de 15 minutos após 3 tentativas malsucedidas.
- Banner com dados do usuário logado e botão de Logout seguro.

### 2. Gestão de Crismandos
- Cadastro de novos crismandos (Nome, Telefone e Valor Mensal).
- Exclusão e listagem de crismandos.
- Autocomplete no campo de busca para seleção rápida no registro de pagamentos.
- Tabela Supabase associada: `crismandos`.

### 3. Registro de Pagamentos
- Seleção inteligente por autocomplete do crismando.
- Seleção de Mês (Janeiro a Dezembro) e Ano (2026 a 2029).
- Prevenção de duplicidade: não permite registrar o mesmo mês/ano duas vezes para um crismando.
- Leitura paginada com `.range()` no Supabase para suportar mais de 1000 registros sem limitação do SDK.
- Tabela Supabase associada: `pagamentos`.

### 4. Geração e Envio de Comprovantes
- Desenhador de comprovante via HTML5 Canvas (layout formatado com título, dados da contribuição, versículo bíblico aleatório e código de autenticação único de 8 caracteres).
- Salva o comprovante em formato PNG.
- Código de autenticação registrado na tabela `codigos_autenticacao`.
- Envio inteligente para WhatsApp com detecção automática do dispositivo:
  - **iOS (iPad/iPhone)**: Interface ajustada com abertura de imagem em nova aba e instrução para salvar na galeria.
  - **Android**: Download automático da imagem com disparo da intent nativa do WhatsApp (`whatsapp://`).
  - **Desktop**: Download direto e abertura do WhatsApp Web (`wa.me`).

### 5. Relatórios e Exportação
- Painel de estatísticas no topo (Total de crismandos, valor arrecadado).
- Relatório Mensal filtrável por Mês/Ano.
- Relatório Completo interativo por cards com resumo financeiro por mês.
- Exportação para Excel (`.xlsx`) do relatório do mês ou relatório completo.
- Pesquisa individual de histórico financeiro por nome do crismando.
- Ferramenta de validação de números de telefone para garantir formato válido no WhatsApp.
- Validador de comprovantes por código de 8 caracteres.

---

## 📍 Onde o Projeto Parou (Estado Atual)

- O projeto está **estável e operacional** em produção client-side integrado ao Supabase.
- **Últimas melhorias efetuadas**:
  1. Adicionado sistema de autenticação client-side (`auth.js`) integrado ao Supabase.
  2. Implementada busca por autocomplete no formulário de pagamento (`campoBuscaCrismando`).
  3. Corrigido o limite de 1000 registros do Supabase utilizando busca paginada (`.range()`) em `carregarDados()`.
  4. Adicionada compatibilidade completa de download/compartilhamento de comprovantes em aparelhos móveis (iOS e Android).
  5. Adicionada skill de agente consultor técnico em `.agent/skill/consultor-tecnico`.
- **Seções inativas / comentadas temporariamente no `index.html`**:
  - Bloco de Upload de Planilha Excel (linhas 43-51 em `index.html`).
  - Tabela principal fixa de crismandos no rodapé (linhas 182-201 em `index.html`), substituída pela dinâmica de relatórios e busca.

---

## 🤖 Guia de Orientação para a LLM

Ao continuar o desenvolvimento deste projeto, siga as diretrizes:
1. **Preserve a simplicidade (KISS/YAGNI)**: O sistema é construído em JavaScript Vanilla e HTML/CSS limpos sem bundlers pesados ou frameworks frontend. Mantenha essa abordagem a menos que explicitamente solicitado.
2. **Respeite a integração com Supabase**: As tabelas principais no banco são `crismandos`, `pagamentos`, `codigos_autenticacao` e `usuarios_autenticados`. Sempre trate erros de consulta Supabase e mantenha a paginação `.range()` ao listar `pagamentos`.
3. **Mantenha o idioma em Português (PT-BR)** para comentários, mensagens de erro, alertas e interface de usuário.
4. **Consultor Técnico**: Para decisões de arquitetura ou refatoração relevante, consulte a skill em `.agent/skill/consultor-tecnico/SKILL.md`.
