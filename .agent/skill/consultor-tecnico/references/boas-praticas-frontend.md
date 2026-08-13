# Boas Práticas — Frontend

> Guia de referência para construção de aplicações frontend modernas, resilientes e de alta qualidade.

---

## Sumário

1. [Arquitetura & Código](#arquitetura--código)
2. [Performance](#performance)
3. [Acessibilidade](#acessibilidade)
4. [Responsividade](#responsividade)
5. [SEO](#seo)
6. [Segurança no Frontend](#segurança-no-frontend)
7. [Testes no Frontend](#testes-no-frontend)
8. [Checklist de Revisão Frontend](#checklist-de-revisão-frontend)

---

## Arquitetura & Código

### Componentização e Reutilização

O frontend moderno é construído com componentes. A regra de ouro é: **cada componente deve ter uma única responsabilidade**. Se ele faz mais de uma coisa, divida.

#### Princípios Fundamentais

| Princípio | Descrição | Exemplo |
|---|---|---|
| **Single Responsibility** | Cada componente faz uma coisa bem feita | `<UserAvatar>` renderiza avatar, `<UserCard>` compõe avatar + nome + bio |
| **DRY (Don't Repeat Yourself)** | Extraia componentes repetidos | Botão usado em 10 lugares → `<Button variant="primary">` |
| **Composição sobre Herança** | Monte componentes complexos a partir de menores | `<Dialog>` = `<Overlay>` + `<DialogContent>` + `<DialogActions>` |
| **Props tipadas e documentadas** | Defina interfaces claras para cada componente | `interface ButtonProps { variant: 'primary' \| 'secondary'; size?: 'sm' \| 'md' \| 'lg' }` |
| **Slots / Children** | Use composição via children para flexibilidade | `<Card><Card.Header /><Card.Body /></Card>` |

#### Anatomia de um Bom Componente

```tsx
// ✅ Componente focado, tipado e reutilizável
interface AlertProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Alert({ variant, title, children, dismissible = false, onDismiss }: AlertProps) {
  return (
    <div role="alert" className={`alert alert--${variant}`}>
      <strong className="alert__title">{title}</strong>
      <div className="alert__content">{children}</div>
      {dismissible && (
        <button 
          className="alert__dismiss" 
          onClick={onDismiss} 
          aria-label="Fechar alerta"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

```tsx
// ❌ Componente inchado com múltiplas responsabilidades
function UserDashboard() {
  // Busca dados da API aqui dentro
  // Gerencia formulário de edição
  // Renderiza tabela
  // Renderiza gráfico
  // Controla modal
  // Tudo em 400 linhas...
}

// ✅ Dividido em componentes menores com responsabilidades claras
function UserDashboard() {
  return (
    <DashboardLayout>
      <UserStats />
      <UserActivityChart />
      <UserTransactionsTable />
      <EditUserModal />
    </DashboardLayout>
  );
}
```

#### Padrão Compound Component

Ideal para componentes complexos que precisam de flexibilidade:

```tsx
// Compound Component Pattern
import { createContext, useContext } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist" className="tabs__list">{children}</div>;
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
      className={`tabs__tab ${activeTab === value ? 'tabs__tab--active' : ''}`}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useContext(TabsContext)!;
  if (activeTab !== value) return null;
  return <div role="tabpanel" className="tabs__panel">{children}</div>;
}

// Exportação composta
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Uso flexível e declarativo
<Tabs defaultTab="geral">
  <Tabs.List>
    <Tabs.Tab value="geral">Geral</Tabs.Tab>
    <Tabs.Tab value="seguranca">Segurança</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="geral"><GeneralSettings /></Tabs.Panel>
  <Tabs.Panel value="seguranca"><SecuritySettings /></Tabs.Panel>
</Tabs>
```

---

### Gerenciamento de Estado

A escolha do tipo de estado é **a decisão arquitetural mais importante** do frontend. Estado no lugar errado causa bugs, re-renders desnecessários e código difícil de manter.

#### Tipos de Estado

| Tipo de Estado | O que é | Quando usar | Ferramentas |
|---|---|---|---|
| **Local State** | Estado interno de um componente | Formulários simples, toggle de UI, contadores | `useState`, `useReducer` |
| **Lifted State** | Estado compartilhado entre irmãos, elevado ao pai | 2-3 componentes próximos precisam do mesmo dado | Props + `useState` no pai |
| **Global State** | Estado acessível em qualquer lugar da árvore | Tema, idioma, dados do usuário logado, carrinho | Zustand, Jotai, Redux Toolkit, Context API |
| **Server State** | Dados vindos do backend (cache, sincronização) | Listagens, detalhes de entidades, dados paginados | TanStack Query, SWR, RTK Query |
| **URL State** | Estado representado na URL | Filtros, paginação, abas, modais com deep link | `useSearchParams`, nuqs, next/router |
| **Form State** | Estado de formulários complexos | Formulários multi-step, validação dinâmica | React Hook Form, Formik, Zod |

#### Árvore de Decisão

```
O dado vem de uma API?
├── SIM → Server State (TanStack Query / SWR)
└── NÃO → É usado por um único componente?
    ├── SIM → Local State (useState / useReducer)
    └── NÃO → É compartilhado por 2-3 componentes próximos?
        ├── SIM → Lifted State (elevar ao pai comum)
        └── NÃO → É necessário em muitas partes da aplicação?
            ├── SIM → Global State (Zustand / Jotai / Redux Toolkit)
            └── NÃO → O estado precisa estar na URL?
                ├── SIM → URL State (useSearchParams)
                └── NÃO → Reavalie a necessidade
```

#### Exemplos Práticos

```tsx
// ✅ Server State com TanStack Query — cache automático, revalidação, loading/error
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
    staleTime: 5 * 60 * 1000,       // 5 minutos antes de considerar "stale"
    gcTime: 30 * 60 * 1000,          // 30 minutos no cache
    retry: 2,                         // 2 tentativas em caso de erro
  });

  if (isLoading) return <Skeleton count={5} />;
  if (error) return <ErrorState message="Erro ao carregar usuários" retry={refetch} />;

  return <UserTable users={users} />;
}

// Mutation com invalidação automática do cache
function CreateUserForm() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newUser: CreateUserDTO) => 
      fetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Revalida a lista
      toast.success('Usuário criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar usuário');
    },
  });

  return <Form onSubmit={mutation.mutate} isLoading={mutation.isPending} />;
}
```

```tsx
// ✅ Global State com Zustand — leve, simples e sem boilerplate
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        toggleTheme: () => set((state) => ({ 
          theme: state.theme === 'light' ? 'dark' : 'light' 
        })),
      }),
      { name: 'theme-storage' }  // Persiste no localStorage
    )
  )
);

// Uso em qualquer componente
function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  return <button onClick={toggleTheme}>Tema: {theme}</button>;
}
```

```tsx
// ✅ URL State para filtros — estado bookmark-able e compartilhável
import { useSearchParams } from 'react-router-dom';

function ProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const category = searchParams.get('category') || 'all';
  const sortBy = searchParams.get('sort') || 'name';
  const page = Number(searchParams.get('page')) || 1;

  const updateFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      prev.set(key, value);
      if (key !== 'page') prev.set('page', '1'); // Reset página ao filtrar
      return prev;
    });
  };

  return (
    <div>
      <Select value={category} onChange={(v) => updateFilter('category', v)} />
      <Select value={sortBy} onChange={(v) => updateFilter('sort', v)} />
    </div>
  );
}
```

#### Erros Comuns no Gerenciamento de Estado

| Erro | Problema | Solução |
|---|---|---|
| Colocar tudo no global state | Re-renders globais, complexidade desnecessária | Só globalize o que realmente é global |
| Duplicar server state no client state | Dados dessincronizados, bugs de cache | Use TanStack Query ou SWR |
| Estado derivado como estado separado | Valores ficam inconsistentes | Calcule valores derivados com `useMemo` |
| Context API para estado de alta frequência | Re-renders em toda a árvore abaixo do Provider | Use Zustand ou Jotai para estado frequente |
| Não normalizar dados complexos | Atualizações difíceis e bugs de referência | Normalize dados relacionais no store |

---

### Padrões de Pastas e Organização

#### Estrutura por Feature (Recomendada para projetos médios/grandes)

```
src/
├── app/                          # Configuração da aplicação
│   ├── routes.tsx                # Definição de rotas
│   ├── providers.tsx             # Providers (theme, auth, query)
│   └── layout.tsx                # Layout principal
│
├── features/                     # Módulos de domínio
│   ├── auth/
│   │   ├── components/           # Componentes específicos de auth
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   ├── hooks/                # Hooks específicos de auth
│   │   │   ├── useAuth.ts
│   │   │   └── usePermissions.ts
│   │   ├── api/                  # Chamadas de API de auth
│   │   │   └── auth.api.ts
│   │   ├── stores/               # Estado global de auth
│   │   │   └── auth.store.ts
│   │   ├── types/                # Tipos de auth
│   │   │   └── auth.types.ts
│   │   ├── utils/                # Utilitários de auth
│   │   │   └── token.utils.ts
│   │   └── index.ts              # Public API — barrel export
│   │
│   ├── products/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── checkout/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       ├── types/
│       └── index.ts
│
├── shared/                       # Código compartilhado entre features
│   ├── components/               # Componentes genéricos (Button, Modal, Input)
│   │   ├── ui/                   # Primitivos visuais
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── index.ts
│   │   └── layout/               # Componentes de layout
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── hooks/                    # Hooks genéricos
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   └── useLocalStorage.ts
│   ├── utils/                    # Funções utilitárias puras
│   │   ├── format.ts
│   │   ├── date.ts
│   │   └── validation.ts
│   ├── types/                    # Tipos globais
│   │   └── common.types.ts
│   ├── constants/                # Constantes da aplicação
│   │   └── app.constants.ts
│   └── styles/                   # Estilos globais e tokens
│       ├── globals.css
│       ├── tokens.css
│       └── reset.css
│
├── pages/                        # Páginas (entry points de rotas)
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── ProductsPage.tsx
│   └── CheckoutPage.tsx
│
└── tests/                        # Setup de testes e utilidades
    ├── setup.ts
    ├── test-utils.tsx            # Wrappers de render com providers
    └── mocks/
        ├── handlers.ts           # MSW handlers
        └── server.ts             # MSW server
```

#### Regras de Import entre Camadas

```
pages/ → pode importar de features/ e shared/
features/ → pode importar de shared/, NUNCA de outras features/
shared/ → NUNCA importa de features/ ou pages/
```

Se duas features precisam compartilhar código, mova para `shared/` ou crie um evento/mensagem.

#### Barrel Exports — Public API de cada Feature

```tsx
// features/auth/index.ts — só exporte o que é público
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { useAuth } from './hooks/useAuth';
export { usePermissions } from './hooks/usePermissions';
export type { User, AuthState } from './types/auth.types';

// ❌ NÃO exporte implementações internas
// export { hashPassword } from './utils/crypto';
```

---

### Separação de Responsabilidades

#### Padrão Container + Presentation

```tsx
// 📦 Container (lógica) — busca dados, gerencia estado, lida com eventos
function UserProfileContainer() {
  const { userId } = useParams();
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
  });

  const updateMutation = useMutation({ mutationFn: updateUser });

  const handleSave = (data: UpdateUserDTO) => {
    updateMutation.mutate({ id: userId!, ...data });
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!user) return <NotFound />;

  return (
    <UserProfileView
      user={user}
      onSave={handleSave}
      isSaving={updateMutation.isPending}
    />
  );
}

// 🎨 Presentation (visual) — apenas renderiza o que recebe via props
interface UserProfileViewProps {
  user: User;
  onSave: (data: UpdateUserDTO) => void;
  isSaving: boolean;
}

function UserProfileView({ user, onSave, isSaving }: UserProfileViewProps) {
  return (
    <Card>
      <Avatar src={user.avatarUrl} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <EditProfileForm onSubmit={onSave} disabled={isSaving} />
    </Card>
  );
}
```

#### Custom Hooks para Extrair Lógica

```tsx
// ✅ Hook customizado encapsula lógica complexa
function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = useMemo(() => ({
    category: searchParams.get('category') || 'all',
    priceMin: Number(searchParams.get('priceMin')) || 0,
    priceMax: Number(searchParams.get('priceMax')) || Infinity,
    sortBy: searchParams.get('sort') || 'relevance',
    page: Number(searchParams.get('page')) || 1,
  }), [searchParams]);

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      prev.set(key, value);
      if (key !== 'page') prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return { filters, setFilter, resetFilters };
}

// Componente fica limpo e focado na apresentação
function ProductsPage() {
  const { filters, setFilter, resetFilters } = useProductFilters();
  const { data, isLoading } = useProducts(filters);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilter} onReset={resetFilters} />
      <ProductGrid products={data?.items} isLoading={isLoading} />
      <Pagination page={filters.page} total={data?.totalPages} onChange={(p) => setFilter('page', String(p))} />
    </div>
  );
}
```

---

### Design System / Padrão Visual Consistente

#### Design Tokens em CSS Custom Properties

```css
/* shared/styles/tokens.css */
:root {
  /* Cores — Primitivas (não usar diretamente nos componentes) */
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-red-500: #ef4444;
  --color-green-500: #22c55e;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-700: #374151;
  --color-gray-900: #111827;
  
  /* Cores — Semânticas (usar nos componentes) */
  --color-primary: var(--color-blue-600);
  --color-primary-hover: var(--color-blue-700);
  --color-danger: var(--color-red-500);
  --color-success: var(--color-green-500);
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-500);
  --color-background: #ffffff;
  --color-surface: var(--color-gray-50);
  --color-border: var(--color-gray-200);
  
  /* Tipografia */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Espaçamento */
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  
  /* Bordas */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-full: 9999px;
  
  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  /* Transições */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
  
  /* Z-index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-tooltip: 600;
  --z-toast: 700;
}

/* Tema escuro */
[data-theme="dark"] {
  --color-text: #f9fafb;
  --color-text-muted: #9ca3af;
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-border: #374151;
  --color-primary: #60a5fa;
  --color-primary-hover: #93bbfd;
}
```

#### Componente com Variantes (usando class-variance-authority)

```tsx
// shared/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

const buttonVariants = cva(
  // Base — estilos aplicados a todas as variantes
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        ghost: 'hover:bg-gray-100 text-gray-700 focus-visible:ring-gray-400',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
        md: 'h-10 px-4 text-sm rounded-lg gap-2',
        lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Spinner className="animate-spin h-4 w-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

---

### TypeScript: Quando e Por Que Usar

**Resposta curta: sempre.** Para qualquer projeto que vá além de um protótipo descartável.

#### Benefícios Concretos

| Benefício | Impacto Real |
|---|---|
| **Erros em tempo de compilação** | Bugs de tipo pegos antes de chegar ao usuário |
| **Autocompletar inteligente** | Produtividade 2-3x maior com IDE (VS Code) |
| **Documentação viva** | Tipos servem como contrato entre equipes/componentes |
| **Refatoração segura** | Renomear uma prop e o compilador mostra tudo que quebrou |
| **Onboarding mais rápido** | Novos devs entendem a codebase pelas interfaces |

#### Configuração Recomendada

```jsonc
// tsconfig.json — configuração estrita recomendada
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    
    // Verificações estritas — TODAS ligadas
    "strict": true,
    "noUncheckedIndexedAccess": true,    // arr[0] retorna T | undefined
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    
    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"]
    },
    
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Padrões de Tipagem Úteis

```tsx
// Tipos utilitários essenciais
type ApiResponse<T> = {
  data: T;
  meta: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
};

// Discriminated unions para estados de UI
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Tipo para props de componente que estende HTML nativo
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
};

// Enum-like com const assertion (melhor que enum)
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
// Resultado: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// Zod para validação + inferência de tipos
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.number().min(18, 'Deve ter pelo menos 18 anos'),
  role: z.enum(['admin', 'editor', 'viewer']),
});

type CreateUserDTO = z.infer<typeof createUserSchema>;
// Tipo inferido automaticamente — sem duplicação!
```

---

## Performance

### Lazy Loading de Componentes e Rotas

Carregue código apenas quando necessário. Cada byte a menos no bundle inicial é tempo ganho no primeiro carregamento.

```tsx
// ✅ Lazy loading de rotas com React.lazy + Suspense
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Cada rota é um chunk separado, carregado sob demanda
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

// Named export? Use assim:
const UserProfile = lazy(() =>
  import('./pages/UserProfile').then((module) => ({ default: module.UserProfile }))
);

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </Suspense>
  );
}
```

```tsx
// ✅ Lazy loading de componentes pesados (ex: editor de texto, gráficos)
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
const ChartDashboard = lazy(() => import('./components/ChartDashboard'));

function ArticleEditor() {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div>
      <Suspense fallback={<EditorSkeleton />}>
        <RichTextEditor />
      </Suspense>
      {showPreview && (
        <Suspense fallback={<ChartSkeleton />}>
          <ChartDashboard />
        </Suspense>
      )}
    </div>
  );
}
```

```tsx
// ✅ Next.js — dynamic import com ssr: false para componentes client-only
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,                    // Não renderiza no servidor (usa APIs do browser)
  loading: () => <MapSkeleton />,
});
```

---

### Code Splitting

```tsx
// ✅ Dynamic import para funcionalidade pesada (ex: exportar PDF)
async function exportToPdf(data: ReportData) {
  // jspdf só é baixado quando o usuário clica em "Exportar PDF"
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.text(data.title, 10, 10);
  doc.save('relatorio.pdf');
}

// ✅ Prefetch de chunk ao hover (antecipa o carregamento)
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const prefetch = () => {
    // O bundler resolve o chunk e começa o download
    if (to === '/admin') import('./pages/admin/Dashboard');
    if (to === '/reports') import('./pages/ReportsPage');
  };

  return (
    <Link to={to} onMouseEnter={prefetch} onFocus={prefetch}>
      {children}
    </Link>
  );
}
```

---

### Otimização de Bundle

#### Configuração Vite Otimizada

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log em produção
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa vendor grandes em chunks dedicados
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    // Reportar tamanho dos chunks
    chunkSizeWarningLimit: 500, // Avisa se chunk > 500kb
  },
});
```

#### Análise de Bundle

```bash
# Instalar analisador de bundle
npm install -D rollup-plugin-visualizer

# Gerar relatório visual do bundle
npx vite build --mode analyze

# Ou usar source-map-explorer
npx source-map-explorer dist/assets/*.js
```

#### Checklist de Otimização de Bundle

| Técnica | Como verificar | Ferramenta |
|---|---|---|
| Tree shaking funcionando | Importações named, não default inteiras | `import { debounce } from 'lodash-es'` |
| Sem duplicação de dependências | Verificar `package-lock.json` | `npx depcheck`, `npm dedupe` |
| Imagens otimizadas | Formato WebP/AVIF, tamanho adequado | `vite-plugin-imagemin`, `sharp` |
| Fontes otimizadas | `font-display: swap`, subset, preload | Variáveis de fonte, subsetting |
| CSS não usado removido | Purgar CSS morto | PurgeCSS (se não usar Tailwind) |

---

### Otimização de Imagens

```html
<!-- ✅ Imagem responsiva com formatos modernos e lazy loading -->
<picture>
  <!-- AVIF: melhor compressão, suporte crescente -->
  <source 
    type="image/avif" 
    srcset="
      /images/hero-400w.avif 400w,
      /images/hero-800w.avif 800w,
      /images/hero-1200w.avif 1200w
    "
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  />
  <!-- WebP: bom suporte, boa compressão -->
  <source 
    type="image/webp" 
    srcset="
      /images/hero-400w.webp 400w,
      /images/hero-800w.webp 800w,
      /images/hero-1200w.webp 1200w
    "
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  />
  <!-- Fallback JPEG -->
  <img 
    src="/images/hero-800w.jpg" 
    alt="Descrição significativa da imagem"
    width="800" 
    height="450"
    loading="lazy"
    decoding="async"
  />
</picture>

<!-- ✅ Imagem acima da dobra (hero) — NÃO usar lazy loading, usar preload -->
<link rel="preload" as="image" href="/images/hero-1200w.avif" type="image/avif" />
<img 
  src="/images/hero-1200w.jpg" 
  alt="Banner principal" 
  width="1200" 
  height="600"
  loading="eager"
  fetchpriority="high"
/>
```

```tsx
// ✅ Next.js Image — otimização automática
import Image from 'next/image';

function ProductCard({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL={product.blurHash}    // Placeholder enquanto carrega
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

---

### Web Vitals: LCP, FID, CLS

| Métrica | O que mede | Meta | Como melhorar |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Tempo até o maior elemento visível carregar | ≤ 2.5s | Otimizar hero image, preload de fontes, SSR/SSG, CDN |
| **FID** (First Input Delay) / **INP** (Interaction to Next Paint) | Tempo de resposta à primeira interação | FID ≤ 100ms / INP ≤ 200ms | Reduzir JS no main thread, code split, web workers |
| **CLS** (Cumulative Layout Shift) | Estabilidade visual (quanto o layout "pula") | ≤ 0.1 | Definir `width` e `height` em imagens, reservar espaço para ads/embeds, `font-display: optional` |

#### Monitoramento

```tsx
// Medir Web Vitals no cliente
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';

function reportWebVitals(metric: Metric) {
  // Enviar para analytics
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,   // 'good' | 'needs-improvement' | 'poor'
      navigationType: metric.navigationType,
    }),
    keepalive: true,  // Garante envio mesmo ao sair da página
  });
}

onCLS(reportWebVitals);
onFID(reportWebVitals);
onLCP(reportWebVitals);
onINP(reportWebVitals);
onTTFB(reportWebVitals);
```

#### Técnicas Específicas para Cada Métrica

```html
<!-- LCP: Preload do recurso mais importante -->
<head>
  <link rel="preload" as="image" href="/hero.avif" type="image/avif" fetchpriority="high" />
  <link rel="preload" as="font" href="/fonts/inter-var.woff2" type="font/woff2" crossorigin />
  <link rel="preconnect" href="https://api.exemplo.com" />
  <link rel="dns-prefetch" href="https://cdn.exemplo.com" />
</head>

<!-- CLS: SEMPRE definir dimensões em imagens e iframes -->
<img src="foto.jpg" alt="Foto" width="800" height="600" />
<iframe src="video.html" width="560" height="315"></iframe>

<!-- CLS: Reservar espaço para conteúdo dinâmico -->
<style>
  .ad-slot {
    min-height: 250px;              /* Reserva espaço antes do ad carregar */
    contain: layout;                /* Isolamento de layout */
  }
  .skeleton {
    aspect-ratio: 16/9;             /* Mantém proporção */
  }
</style>
```

---

### CDN para Assets Estáticos

```nginx
# Configuração de headers de cache no Nginx (ou via CDN)
location /assets/ {
    # Assets com hash no nome — cache imutável
    # Ex: main.a1b2c3d4.js, styles.e5f6g7h8.css
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location /images/ {
    # Imagens — cache longo com revalidação
    add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800";
}

location / {
    # HTML — sempre revalidar
    add_header Cache-Control "no-cache, must-revalidate";
}
```

**CDNs recomendadas**: Cloudflare (gratuito), AWS CloudFront, Vercel Edge Network, Fastly.

---

### SSR/SSG — Quando Faz Sentido

| Estratégia | Quando usar | Frameworks |
|---|---|---|
| **CSR** (Client-Side Rendering) | Dashboards internos, apps autenticadas, painéis admin | Vite + React, CRA |
| **SSR** (Server-Side Rendering) | Conteúdo dinâmico que precisa de SEO (e-commerce, marketplace) | Next.js, Nuxt, Remix |
| **SSG** (Static Site Generation) | Conteúdo que muda pouco (blog, docs, landing page) | Next.js, Astro, Hugo |
| **ISR** (Incremental Static Regeneration) | SSG + revalidação periódica | Next.js |
| **Streaming SSR** | Páginas com partes lentas (ex: recomendações) | Next.js App Router, Remix |

```tsx
// Next.js App Router — cada page pode ter sua estratégia
// app/blog/[slug]/page.tsx — SSG com revalidação
export const revalidate = 3600; // Revalida a cada 1 hora

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  return <Article post={post} />;
}
```

---

### Service Workers e PWA

```ts
// service-worker.ts — cache estratégico
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache de assets gerados no build
precacheAndRoute(self.__WB_MANIFEST);

// Cache de imagens — Cache First (imagem não muda)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache de API — Network First (dados frescos, fallback offline)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
    ],
  })
);

// Cache de fontes — Cache First
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);
```

```json
// manifest.json — PWA
{
  "name": "Minha Aplicação",
  "short_name": "MeuApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Acessibilidade

### WCAG 2.1 — Nível AA (Mínimo Obrigatório)

A acessibilidade não é opcional — é requisito legal em muitos países e uma obrigação ética. **1 bilhão de pessoas no mundo vivem com alguma deficiência**.

#### Princípios POUR

| Princípio | Significado | Exemplos |
|---|---|---|
| **Perceptível** | Conteúdo deve ser percebido por todos os sentidos | Alt text, legendas em vídeos, contraste |
| **Operável** | Interface deve funcionar com qualquer dispositivo de entrada | Teclado, voz, switch |
| **Compreensível** | Conteúdo e operação devem ser entendíveis | Linguagem clara, feedback de erros |
| **Robusto** | Funciona com tecnologias assistivas atuais e futuras | HTML semântico, ARIA correto |

---

### Semântica HTML

```html
<!-- ✅ HTML semântico — a melhor acessibilidade é a mais simples -->
<header>
  <nav aria-label="Navegação principal">
    <ul>
      <li><a href="/">Início</a></li>
      <li><a href="/produtos">Produtos</a></li>
      <li><a href="/contato">Contato</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Título do Artigo</h1>
    <p>Conteúdo do artigo...</p>
    
    <section aria-labelledby="comentarios-titulo">
      <h2 id="comentarios-titulo">Comentários</h2>
      <!-- Comentários aqui -->
    </section>
  </article>
  
  <aside aria-label="Artigos relacionados">
    <h2>Artigos Relacionados</h2>
    <!-- Sidebar -->
  </aside>
</main>

<footer>
  <p>&copy; 2026 Empresa. Todos os direitos reservados.</p>
</footer>

<!-- ❌ Sopa de divs — sem valor semântico -->
<div class="header">
  <div class="nav">
    <div class="nav-item"><span onclick="...">Início</span></div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">Título</div>
  </div>
</div>
```

#### Elementos Semânticos e Quando Usar

| Elemento | Quando usar | Não usar para |
|---|---|---|
| `<button>` | Ações (abrir modal, enviar form, toggle) | Navegação (use `<a>`) |
| `<a href>` | Navegação para outra página/seção | Ações que não mudam URL |
| `<nav>` | Grupos de links de navegação | Qualquer lista de links |
| `<main>` | Conteúdo principal (1 por página) | Seções repetidas |
| `<article>` | Conteúdo independente (post, produto) | Seções de layout |
| `<section>` | Agrupamento temático com heading | Wrapper de estilo |
| `<aside>` | Conteúdo tangencialmente relacionado | Sidebar sem relação ao main |
| `<figure>` + `<figcaption>` | Imagens, gráficos, código com legenda | Decoração |
| `<time datetime>` | Datas e horários | Texto genérico |
| `<dialog>` | Modais nativos | `<div>` simulando modal |

---

### ARIA Attributes

**Primeira regra do ARIA: não use ARIA se HTML nativo resolve.** ARIA é para quando não existe elemento HTML nativo adequado.

```tsx
// ✅ ARIA bem aplicado — Componente customizado sem equivalente HTML
function Combobox({ options, label }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  
  return (
    <div>
      <label id="combo-label">{label}</label>
      <input
        role="combobox"
        aria-labelledby="combo-label"
        aria-expanded={isOpen}
        aria-controls="combo-listbox"
        aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
        aria-autocomplete="list"
      />
      {isOpen && (
        <ul id="combo-listbox" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`option-${index}`}
              role="option"
              aria-selected={selected === option.value}
              onClick={() => setSelected(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// ✅ Live regions — anunciar mudanças dinâmicas para screen readers
function SearchResults({ results, isLoading }: SearchResultsProps) {
  return (
    <div>
      {/* Região "educada" — anuncia quando o conteúdo muda */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading 
          ? 'Buscando resultados...' 
          : `${results.length} resultados encontrados`
        }
      </div>
      
      {/* Região "assertiva" — interrompe o que está sendo lido (para erros) */}
      <div aria-live="assertive" className="sr-only">
        {error && `Erro: ${error.message}`}
      </div>
      
      <ul>
        {results.map(result => <ResultItem key={result.id} {...result} />)}
      </ul>
    </div>
  );
}
```

```css
/* Classe para conteúdo visível apenas para screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### ARIA — O que Usar e O que Evitar

| Padrão | Uso correto | Erro comum |
|---|---|---|
| `aria-label` | Quando não há texto visível (`<button aria-label="Fechar">×</button>`) | Duplicar texto já visível |
| `aria-labelledby` | Referenciar heading existente como label | Criar texto invisível desnecessário |
| `aria-describedby` | Texto de ajuda adicional (hints, erros) | Usar para label principal |
| `aria-hidden="true"` | Ícones decorativos, conteúdo duplicado | Esconder conteúdo funcional |
| `role` | Componentes customizados sem equivalente HTML | Colocar role em elementos nativos |

---

### Navegação por Teclado

```tsx
// ✅ Gerenciamento de foco — Focus trap em modal
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Salvar foco anterior
      previousFocus.current = document.activeElement as HTMLElement;
      
      // Mover foco para o modal
      modalRef.current?.focus();
      
      return () => {
        // Restaurar foco ao fechar
        previousFocus.current?.focus();
      };
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    
    // Focus trap — Tab e Shift+Tab ficam dentro do modal
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements?.length) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="modal"
      >
        {children}
      </div>
    </div>
  );
}
```

#### Teclas Esperadas por Componente

| Componente | Teclas esperadas |
|---|---|
| **Botão** | `Enter`, `Space` → ativar |
| **Link** | `Enter` → navegar |
| **Modal** | `Escape` → fechar, `Tab` → circular dentro |
| **Menu/Dropdown** | `Enter`/`Space` → abrir, `↑↓` → navegar, `Escape` → fechar |
| **Tabs** | `←→` → trocar aba, `Home` → primeira, `End` → última |
| **Accordion** | `Enter`/`Space` → expandir/colapsar |
| **Checkbox** | `Space` → toggle |
| **Radio** | `←→↑↓` → trocar opção |

---

### Contraste de Cores

| Nível | Texto normal (< 18px) | Texto grande (≥ 18px ou 14px bold) | Elementos gráficos |
|---|---|---|---|
| **AA** (mínimo) | 4.5:1 | 3:1 | 3:1 |
| **AAA** (ideal) | 7:1 | 4.5:1 | — |

```css
/* ✅ Exemplos de combinações com bom contraste */
.text-primary {
  color: #1e3a5f;           /* Texto escuro sobre fundo claro → contraste 10.5:1 */
  background: #ffffff;
}

.text-on-dark {
  color: #f0f0f0;           /* Texto claro sobre fundo escuro → contraste 12.5:1 */
  background: #1a1a2e;
}

/* ❌ Contraste insuficiente */
.text-bad {
  color: #999999;           /* Cinza sobre branco → contraste 2.8:1 (FALHA) */
  background: #ffffff;
}

/* ✅ Não depender apenas de cor para transmitir informação */
.input-error {
  border-color: #dc2626;                     /* Cor vermelha */
  border-width: 2px;                         /* Borda mais grossa */
  background-image: url('/icons/error.svg'); /* Ícone de erro */
}
/* + mensagem de texto explicativa ao lado */
```

**Ferramentas para verificar contraste**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Extensão Chrome: "WCAG Color Contrast Checker"
- Figma plugin: "Stark"
- DevTools do Chrome → Rendering → Emulate vision deficiencies

---

### Screen Readers

| Screen Reader | Sistema Operacional | Navegador | Custo |
|---|---|---|---|
| **NVDA** | Windows | Firefox, Chrome | Gratuito |
| **JAWS** | Windows | Chrome, Edge | Pago |
| **VoiceOver** | macOS, iOS | Safari | Nativo |
| **TalkBack** | Android | Chrome | Nativo |
| **Narrator** | Windows | Edge | Nativo |

**Teste com pelo menos NVDA + VoiceOver** para cobrir a maioria dos usuários.

---

### Ferramentas de Teste de Acessibilidade

```bash
# axe-core — testes automatizados no CI
npm install -D @axe-core/cli
npx axe http://localhost:3000 --exit

# Pa11y — CI-friendly com múltiplas URLs
npm install -D pa11y-ci
npx pa11y-ci --config .pa11yci.json

# eslint-plugin-jsx-a11y — pega erros no código
npm install -D eslint-plugin-jsx-a11y
```

```json
// .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 30000,
    "wait": 2000
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/products",
    "http://localhost:3000/checkout"
  ]
}
```

```tsx
// Teste de acessibilidade integrado com Jest/Vitest
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('formulário de login não tem violações de acessibilidade', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Responsividade

### Mobile-First

Comece pelo menor viewport e adicione complexidade conforme o espaço aumenta. **Não tente "encolher" o desktop para mobile**.

```css
/* ✅ Mobile-first — estilos base são para mobile */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;            /* Mobile: 1 coluna */
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}

/* Tablet */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr); /* Tablet: 2 colunas */
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 colunas */
    gap: var(--spacing-8);
    padding: var(--spacing-8);
  }
}

/* Desktop grande */
@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr); /* Desktop grande: 4 colunas */
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

---

### Breakpoints Consistentes

Defina breakpoints uma vez e use em todo o projeto:

```css
/* Breakpoints padronizados (Tailwind CSS defaults) */
:root {
  --breakpoint-sm: 640px;   /* Smartphones landscape */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Laptops */
  --breakpoint-xl: 1280px;  /* Desktops */
  --breakpoint-2xl: 1536px; /* Telas grandes */
}
```

```tsx
// Hook para usar breakpoints no JS
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Uso
function Navigation() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

---

### Flexbox e Grid

```css
/* ✅ Layout responsivo com CSS Grid — sem media queries */
.auto-grid {
  display: grid;
  /* Colunas se ajustam automaticamente: mínimo 280px, máximo 1fr */
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: var(--spacing-6);
}

/* ✅ Sidebar + conteúdo responsivo */
.layout {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .layout {
    grid-template-columns: 280px 1fr;
  }
}

/* ✅ Flexbox para alinhamento e distribuição */
.toolbar {
  display: flex;
  flex-wrap: wrap;                /* Quebra para nova linha se não couber */
  align-items: center;
  gap: var(--spacing-3);
}

.toolbar__spacer {
  flex: 1;                        /* Empurra itens para os lados */
}

/* ✅ Container queries — responsivo ao container, não ao viewport */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;           /* Layout horizontal quando cabe */
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;        /* Layout vertical quando estreito */
  }
}
```

---

### Imagens Responsivas

```html
<!-- ✅ srcset + sizes para servir imagem certa para cada viewport -->
<img
  src="/images/product-800.jpg"
  srcset="
    /images/product-400.jpg 400w,
    /images/product-800.jpg 800w,
    /images/product-1200.jpg 1200w,
    /images/product-1600.jpg 1600w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Produto XYZ"
  loading="lazy"
  decoding="async"
  width="800"
  height="600"
/>

<!-- ✅ Art direction — imagens diferentes para mobile vs desktop -->
<picture>
  <!-- Mobile: imagem cortada/quadrada -->
  <source media="(max-width: 767px)" srcset="/images/hero-mobile.avif" type="image/avif" />
  <source media="(max-width: 767px)" srcset="/images/hero-mobile.webp" type="image/webp" />
  <!-- Desktop: imagem widescreen -->
  <source media="(min-width: 768px)" srcset="/images/hero-desktop.avif" type="image/avif" />
  <source media="(min-width: 768px)" srcset="/images/hero-desktop.webp" type="image/webp" />
  <img src="/images/hero-desktop.jpg" alt="Banner principal" width="1440" height="600" />
</picture>
```

```css
/* ✅ Imagens responsivas com CSS */
img {
  max-width: 100%;    /* Nunca ultrapassa o container */
  height: auto;        /* Mantém proporção */
  display: block;      /* Remove espaço embaixo (inline default) */
}

/* Aspect ratio para containers de imagem */
.image-wrapper {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;   /* Preenche sem distorcer */
}
```

---

## SEO

### Meta Tags Essenciais

```html
<head>
  <!-- Básico -->
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nome da Página — Nome do Site</title>
  <meta name="description" content="Descrição clara e concisa com 150-160 caracteres, incluindo palavras-chave naturais." />
  <link rel="canonical" href="https://www.exemplo.com/pagina" />
  
  <!-- Open Graph (Facebook, LinkedIn) -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.exemplo.com/pagina" />
  <meta property="og:title" content="Título para compartilhamento" />
  <meta property="og:description" content="Descrição para compartilhamento" />
  <meta property="og:image" content="https://www.exemplo.com/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="pt_BR" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@empresa" />
  <meta name="twitter:title" content="Título para Twitter" />
  <meta name="twitter:description" content="Descrição para Twitter" />
  <meta name="twitter:image" content="https://www.exemplo.com/twitter-image.jpg" />
  
  <!-- Robots -->
  <meta name="robots" content="index, follow" />
  
  <!-- Idioma alternativo (sites multilíngue) -->
  <link rel="alternate" hreflang="pt-BR" href="https://www.exemplo.com/pt-br/pagina" />
  <link rel="alternate" hreflang="en" href="https://www.exemplo.com/en/page" />
  <link rel="alternate" hreflang="x-default" href="https://www.exemplo.com/en/page" />
  
  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
</head>
```

---

### Structured Data (JSON-LD)

```html
<!-- Produto -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Camiseta Premium",
  "image": "https://www.exemplo.com/images/camiseta.jpg",
  "description": "Camiseta de algodão orgânico com estampa exclusiva",
  "brand": { "@type": "Brand", "name": "MinhaMarca" },
  "sku": "CAM-001",
  "offers": {
    "@type": "Offer",
    "url": "https://www.exemplo.com/produtos/camiseta-premium",
    "priceCurrency": "BRL",
    "price": "89.90",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "Loja Exemplo" }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
</script>

<!-- FAQ -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qual o prazo de entrega?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "O prazo de entrega é de 3 a 7 dias úteis para capitais."
      }
    },
    {
      "@type": "Question",
      "name": "Posso trocar o produto?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim, aceitamos trocas em até 30 dias após o recebimento."
      }
    }
  ]
}
</script>

<!-- Organização -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Empresa Exemplo",
  "url": "https://www.exemplo.com",
  "logo": "https://www.exemplo.com/logo.png",
  "sameAs": [
    "https://www.facebook.com/empresa",
    "https://www.instagram.com/empresa",
    "https://www.linkedin.com/company/empresa"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+55-11-99999-9999",
    "contactType": "customer service",
    "availableLanguage": "Portuguese"
  }
}
</script>

<!-- Artigo / Blog Post -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Título do Artigo",
  "author": { "@type": "Person", "name": "João Silva" },
  "datePublished": "2026-01-15",
  "dateModified": "2026-06-01",
  "image": "https://www.exemplo.com/blog/artigo-imagem.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "Empresa Exemplo",
    "logo": { "@type": "ImageObject", "url": "https://www.exemplo.com/logo.png" }
  }
}
</script>
```

**Ferramenta de validação**: [Google Rich Results Test](https://search.google.com/test/rich-results)

---

### Sitemap

```xml
<!-- sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.exemplo.com/</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.exemplo.com/produtos</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.exemplo.com/blog</loc>
    <lastmod>2026-05-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

```tsx
// Next.js — geração automática de sitemap
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const posts = await getAllPosts();
  
  const productUrls = products.map((product) => ({
    url: `https://www.exemplo.com/produtos/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  
  const postUrls = posts.map((post) => ({
    url: `https://www.exemplo.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));
  
  return [
    { url: 'https://www.exemplo.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://www.exemplo.com/produtos', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...productUrls,
    ...postUrls,
  ];
}
```

---

### Heading Hierarchy

```html
<!-- ✅ Hierarquia correta — um h1, headings sequenciais -->
<h1>Loja de Eletrônicos</h1>              <!-- 1 por página -->
  <h2>Smartphones</h2>
    <h3>Samsung Galaxy S25</h3>
    <h3>iPhone 17</h3>
  <h2>Notebooks</h2>
    <h3>MacBook Pro</h3>
    <h3>Dell XPS 15</h3>
      <h4>Especificações Técnicas</h4>
      <h4>Avaliações</h4>
  <h2>Acessórios</h2>

<!-- ❌ Hierarquia quebrada — pula níveis, múltiplos h1 -->
<h1>Título</h1>
<h1>Subtítulo</h1>           <!-- ❌ Dois h1 -->
<h3>Seção</h3>               <!-- ❌ Pulou h2 -->
<h5>Subseção</h5>            <!-- ❌ Pulou h4 -->
```

**Dica**: Headings podem ser estilizados de qualquer forma via CSS. Use o nível correto para semântica, CSS para visual:

```css
/* Estilo de h3 visual, mas semântica de h2 */
h2.section-subtitle {
  font-size: var(--font-size-lg);
  font-weight: 500;
}
```

---

### Core Web Vitals e SEO

O Google usa Core Web Vitals como fator de ranking. Referência rápida:

| Métrica | Bom | Precisa melhorar | Ruim |
|---|---|---|---|
| **LCP** | ≤ 2.5s | 2.5s–4.0s | > 4.0s |
| **INP** | ≤ 200ms | 200ms–500ms | > 500ms |
| **CLS** | ≤ 0.1 | 0.1–0.25 | > 0.25 |

**Ferramentas para medir**: Google PageSpeed Insights, Chrome DevTools → Lighthouse, Google Search Console → Core Web Vitals report.

---

## Segurança no Frontend

### XSS Prevention (Cross-Site Scripting)

```tsx
// ✅ React já escapa por padrão — isso é seguro
function UserComment({ comment }: { comment: string }) {
  return <p>{comment}</p>;  // HTML entities escapados automaticamente
}

// ❌ PERIGO: dangerouslySetInnerHTML sem sanitização
function UnsafeContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;  // ❌ XSS!
}

// ✅ Se precisar renderizar HTML, sanitize com DOMPurify
import DOMPurify from 'dompurify';

function SafeHtmlContent({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
```

```tsx
// ✅ Sanitizar inputs do usuário
import { z } from 'zod';

const commentSchema = z.object({
  text: z.string()
    .min(1, 'Comentário não pode ser vazio')
    .max(1000, 'Máximo 1000 caracteres')
    .transform((val) => val.trim()),  // Remove espaços extras
  authorId: z.string().uuid(),
});

// ✅ Nunca construir URLs com input do usuário sem validar
function safeRedirect(url: string) {
  const parsed = new URL(url, window.location.origin);
  // Só permite redirect para o mesmo domínio
  if (parsed.origin !== window.location.origin) {
    throw new Error('Redirect para domínio externo bloqueado');
  }
  window.location.href = parsed.href;
}
```

---

### CSP (Content Security Policy)

```html
<!-- Headers HTTP (configurar no servidor/CDN) -->
<!--
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123' https://cdn.exemplo.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https://cdn.exemplo.com https://images.exemplo.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.exemplo.com https://analytics.exemplo.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
-->

<!-- Meta tag (fallback, mas headers HTTP são preferidos) -->
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline';" />

<!-- Scripts com nonce (CSP nonce-based) -->
<script nonce="abc123" src="/app.js"></script>
```

---

### Clickjacking Protection

```
# Headers HTTP
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';
```

---

### Não Expor Dados Sensíveis no Client

```tsx
// ❌ NUNCA faça isso
const API_SECRET = 'sk_live_abc123';  // Variável no client-side
fetch(`/api/data?secret=${API_SECRET}`);

// ❌ NUNCA faça isso
// .env.local (sem NEXT_PUBLIC_ — mas acessado no client)
const secret = process.env.SECRET_KEY;  // undefined no browser, mas exposição no build

// ✅ Use variáveis de ambiente do servidor
// .env.local
// NEXT_PUBLIC_API_URL=https://api.exemplo.com    ← ok, público
// DATABASE_URL=postgres://...                     ← segredo, só server

// ✅ Proxy via API route / BFF (Backend For Frontend)
// app/api/data/route.ts (server-side)
export async function GET() {
  const data = await fetch('https://api-externa.com/data', {
    headers: { 'Authorization': `Bearer ${process.env.API_SECRET}` },
  });
  return Response.json(await data.json());
}
```

```tsx
// ✅ Checar o que vai no bundle — environment vars expostas
// next.config.js — só NEXT_PUBLIC_* são incluídas no bundle
// Vite — só VITE_* são incluídas no bundle

// Auditar: procurar strings sensíveis no bundle gerado
// npx source-map-explorer dist/assets/*.js
```

---

### Validação Client + Server

```tsx
// ✅ Validação compartilhada com Zod (mesmo schema no client e server)
// shared/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Deve conter pelo menos 1 maiúscula, 1 minúscula e 1 número'
  ),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
});

// Client — validação no formulário (UX rápido)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createUserSchema),
  });
  // ...
}

// Server — validação na API (segurança real)
// app/api/users/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const result = createUserSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }
  
  // Dados validados e tipados
  const user = await createUser(result.data);
  return Response.json(user, { status: 201 });
}
```

> **Regra de ouro**: validação no client é para UX (feedback rápido). Validação no server é para segurança (nunca confie no client).

---

### SRI (Subresource Integrity) para Scripts Terceiros

```html
<!-- ✅ SRI garante que o script não foi alterado -->
<script 
  src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
  integrity="sha384-7xtXxBHNmXkHlWr4s7jPjVMXq4qQPCkVR+HfbQnW4Fes3P5iqVxVYBOY5JFAA7T"
  crossorigin="anonymous"
></script>

<link 
  rel="stylesheet" 
  href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css"
  integrity="sha384-..."
  crossorigin="anonymous"
/>
```

```bash
# Gerar hash SRI
openssl dgst -sha384 -binary arquivo.js | openssl base64 -A
# Ou usar: https://www.srihash.org/
```

---

### Cookies Seguros

```tsx
// ✅ Configuração segura de cookies (via server)
// Usando next.js API route como exemplo
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = cookies();
  
  cookieStore.set('session', sessionToken, {
    httpOnly: true,         // Não acessível via JavaScript (previne XSS)
    secure: true,           // Só enviado via HTTPS
    sameSite: 'lax',        // Previne CSRF (strict se possível)
    path: '/',
    maxAge: 60 * 60 * 24 * 7,  // 7 dias
    domain: '.exemplo.com',
  });
}
```

---

### Não Usar localStorage para Tokens

```tsx
// ❌ NUNCA armazene tokens de autenticação no localStorage
localStorage.setItem('accessToken', token);  // Acessível por qualquer JS na página → XSS = roubo

// ❌ sessionStorage também é vulnerável a XSS
sessionStorage.setItem('accessToken', token);

// ✅ Use cookies HttpOnly (configurados pelo server)
// O token nunca é acessível via JavaScript no browser

// ✅ Se precisar de token no client (ex: SPA com API externa), use:
// 1. Cookie HttpOnly para refresh token
// 2. Token de curta duração (15min) em memória (variável JS, não storage)

class TokenManager {
  private accessToken: string | null = null;  // Apenas em memória
  
  setToken(token: string) {
    this.accessToken = token;
  }
  
  getToken(): string | null {
    return this.accessToken;
  }
  
  clearToken() {
    this.accessToken = null;
  }
  
  // Refresh via cookie HttpOnly
  async refreshToken(): Promise<string> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // Envia cookie automaticamente
    });
    
    if (!response.ok) throw new Error('Refresh falhou');
    
    const { accessToken } = await response.json();
    this.setToken(accessToken);
    return accessToken;
  }
}

export const tokenManager = new TokenManager();
```

| Método de Armazenamento | Vulnerável a XSS? | Enviado automaticamente? | Recomendação |
|---|---|---|---|
| `localStorage` | ✅ Sim | ❌ Não | ❌ Nunca para tokens |
| `sessionStorage` | ✅ Sim | ❌ Não | ❌ Nunca para tokens |
| Cookie `HttpOnly` | ❌ Não | ✅ Sim | ✅ **Recomendado** |
| Memória (variável JS) | Parcialmente | ❌ Não | ✅ Para tokens de curta duração |

---

## Testes no Frontend

### Testes Unitários: Componentes e Funções Utilitárias

```tsx
// Configuração: Vitest + Testing Library
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/tests/'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

```tsx
// src/tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

```tsx
// ✅ Teste de componente — testar comportamento, não implementação
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  it('renderiza com valor inicial', () => {
    render(<Counter initialValue={5} />);
    expect(screen.getByText('Contagem: 5')).toBeInTheDocument();
  });

  it('incrementa ao clicar no botão +', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={0} />);
    
    await user.click(screen.getByRole('button', { name: 'Incrementar' }));
    
    expect(screen.getByText('Contagem: 1')).toBeInTheDocument();
  });

  it('chama onChange quando o valor muda', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Counter initialValue={0} onChange={onChange} />);
    
    await user.click(screen.getByRole('button', { name: 'Incrementar' }));
    
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('não permite valor menor que zero quando min={0}', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={0} min={0} />);
    
    const decrementButton = screen.getByRole('button', { name: 'Decrementar' });
    expect(decrementButton).toBeDisabled();
  });
});
```

```tsx
// ✅ Teste de formulário
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('mostra erros de validação para campos vazios', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);
    
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    
    expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
  });

  it('envia dados corretos ao preencher e submeter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={onSubmit} />);
    
    await user.type(screen.getByLabelText('Email'), 'joao@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'MinhaS3nha!');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'joao@exemplo.com',
        password: 'MinhaS3nha!',
      });
    });
  });

  it('desabilita botão durante o envio', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => new Promise(() => {})} />);
    
    await user.type(screen.getByLabelText('Email'), 'joao@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'MinhaS3nha!');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    
    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
  });
});
```

```tsx
// ✅ Teste de funções utilitárias
import { formatCurrency, formatCPF, truncateText } from './format';

describe('formatCurrency', () => {
  it('formata valor em reais', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50');
  });

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formata valores negativos', () => {
    expect(formatCurrency(-99.9)).toBe('-R$ 99,90');
  });
});

describe('formatCPF', () => {
  it('formata CPF numérico', () => {
    expect(formatCPF('12345678900')).toBe('123.456.789-00');
  });
});

describe('truncateText', () => {
  it('trunca texto longo e adiciona reticências', () => {
    expect(truncateText('Texto muito longo para exibir', 15)).toBe('Texto muito lon...');
  });

  it('não trunca texto curto', () => {
    expect(truncateText('Curto', 15)).toBe('Curto');
  });
});
```

---

### Testes de Integração: Fluxos entre Componentes

```tsx
// ✅ Teste de integração com MSW (Mock Service Worker)
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsPage } from './ProductsPage';

// Mock server
const server = setupServer(
  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    const products = [
      { id: 1, name: 'Camiseta', category: 'roupas', price: 49.90 },
      { id: 2, name: 'Calça', category: 'roupas', price: 129.90 },
      { id: 3, name: 'Notebook', category: 'eletronicos', price: 4999.00 },
    ];
    
    const filtered = category && category !== 'all'
      ? products.filter(p => p.category === category)
      : products;
    
    return HttpResponse.json({ items: filtered, total: filtered.length });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductsPage — integração', () => {
  it('carrega e exibe produtos', async () => {
    renderWithProviders(<ProductsPage />);
    
    // Loading state
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    
    // Produtos carregados
    await waitFor(() => {
      expect(screen.getByText('Camiseta')).toBeInTheDocument();
      expect(screen.getByText('Notebook')).toBeInTheDocument();
    });
  });

  it('filtra produtos por categoria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductsPage />);
    
    await waitFor(() => expect(screen.getByText('Camiseta')).toBeInTheDocument());
    
    // Selecionar filtro
    await user.selectOptions(screen.getByLabelText('Categoria'), 'eletronicos');
    
    // Apenas eletrônicos visíveis
    await waitFor(() => {
      expect(screen.getByText('Notebook')).toBeInTheDocument();
      expect(screen.queryByText('Camiseta')).not.toBeInTheDocument();
    });
  });

  it('exibe estado de erro quando a API falha', async () => {
    server.use(
      http.get('/api/products', () => HttpResponse.json(null, { status: 500 }))
    );
    
    renderWithProviders(<ProductsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });
});
```

---

### Testes E2E: Fluxos Críticos

```ts
// ✅ Playwright — teste E2E de fluxo de compra
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Fluxo de Compra', () => {
  test.beforeEach(async ({ page }) => {
    // Seed de dados ou mock de API
    await page.goto('/');
  });

  test('usuário completa uma compra com sucesso', async ({ page }) => {
    // 1. Navegar para produtos
    await page.getByRole('link', { name: 'Produtos' }).click();
    await expect(page).toHaveURL('/produtos');
    
    // 2. Adicionar produto ao carrinho
    const productCard = page.getByTestId('product-card').first();
    await productCard.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    
    // 3. Verificar badge do carrinho
    await expect(page.getByTestId('cart-badge')).toHaveText('1');
    
    // 4. Ir para o carrinho
    await page.getByRole('link', { name: 'Carrinho' }).click();
    await expect(page).toHaveURL('/carrinho');
    
    // 5. Verificar item no carrinho
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    
    // 6. Finalizar compra
    await page.getByRole('button', { name: 'Finalizar compra' }).click();
    
    // 7. Preencher dados de entrega
    await page.getByLabel('CEP').fill('01001-000');
    await page.getByLabel('Número').fill('42');
    await page.getByRole('button', { name: 'Continuar' }).click();
    
    // 8. Selecionar forma de pagamento
    await page.getByLabel('Cartão de crédito').click();
    await page.getByLabel('Número do cartão').fill('4111 1111 1111 1111');
    await page.getByLabel('Validade').fill('12/28');
    await page.getByLabel('CVV').fill('123');
    await page.getByRole('button', { name: 'Pagar' }).click();
    
    // 9. Confirmar pedido
    await expect(page.getByText('Pedido confirmado')).toBeVisible();
    await expect(page.getByTestId('order-number')).toBeVisible();
  });

  test('exibe erro para cartão inválido', async ({ page }) => {
    // ... navegar até pagamento
    await page.getByLabel('Número do cartão').fill('0000 0000 0000 0000');
    await page.getByRole('button', { name: 'Pagar' }).click();
    
    await expect(page.getByText('Cartão inválido')).toBeVisible();
  });
});
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',      // Trace para debug de falhas
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### Visual Regression Testing

```ts
// ✅ Chromatic — integrado com Storybook
// .github/workflows/chromatic.yml
// name: Chromatic
// on: push
// jobs:
//   chromatic:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v4
//         with: { fetch-depth: 0 }
//       - uses: actions/setup-node@v4
//       - run: npm ci
//       - uses: chromaui/action@latest
//         with:
//           projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
//           exitZeroOnChanges: true

// ✅ Playwright — screenshot comparison nativo
test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,    // Tolerância de 1%
    fullPage: true,
  });
});

test('componente Button em todos os estados', async ({ page }) => {
  await page.goto('/storybook/iframe.html?id=button--all-variants');
  await expect(page.locator('.story-container')).toHaveScreenshot('button-variants.png');
});
```

| Ferramenta | Tipo | Integração | Custo |
|---|---|---|---|
| **Chromatic** | Cloud | Storybook | Gratuito até 5k snapshots/mês |
| **Percy** | Cloud | Qualquer CI | Gratuito até 5k snapshots/mês |
| **Playwright** | Local | Nativo | Gratuito |
| **BackstopJS** | Local | Puppeteer | Gratuito |

---

### Teste de Acessibilidade Automatizado

```tsx
// ✅ axe-core com Vitest/Jest
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Acessibilidade', () => {
  it('LoginForm sem violações', async () => {
    const { container } = render(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ProductCard sem violações', async () => {
    const { container } = render(
      <ProductCard product={mockProduct} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Navigation sem violações', async () => {
    const { container } = render(<Navigation />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

```ts
// ✅ axe-core com Playwright
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('página de produtos é acessível', async ({ page }) => {
  await page.goto('/produtos');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  expect(results.violations).toEqual([]);
});
```

---

### Teste de Performance

```yaml
# ✅ Lighthouse CI no GitHub Actions
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/produtos",
        "http://localhost:3000/checkout"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

### Pirâmide de Testes Frontend

```
          /‾‾‾‾‾‾‾‾\
         /   E2E     \          ← Poucos: fluxos críticos (login, compra, cadastro)
        /  (Playwright) \
       /________________\
      /                    \
     /   Integração          \    ← Moderados: fluxos entre componentes com API mockada
    /   (Testing Library +    \
   /     MSW)                  \
  /____________________________\
 /                                \
/     Unitários                     \  ← Muitos: componentes, hooks, utils, stores
/ (Vitest + Testing Library)          \
/______________________________________\
```

| Tipo | Quantidade | Velocidade | Confiança | O que testar |
|---|---|---|---|---|
| **Unitário** | Muitos (70%) | Rápido (~ms) | Baixa (isolado) | Componentes, hooks, utils, stores |
| **Integração** | Moderados (20%) | Médio (~s) | Média | Fluxos entre componentes, API mockada |
| **E2E** | Poucos (10%) | Lento (~10s) | Alta (real) | Fluxos críticos de negócio |
| **Visual** | Moderados | Médio | Alta (visual) | Screenshots de componentes/páginas |

---

## Checklist de Revisão Frontend

Use este checklist para avaliar a qualidade de um projeto ou PR frontend.

### Arquitetura & Código

- [ ] Componentes com responsabilidade única (< 200 linhas)
- [ ] Props tipadas com TypeScript (interfaces/types explícitas)
- [ ] Sem lógica de negócio em componentes de apresentação
- [ ] Custom hooks para lógica reutilizável
- [ ] Gerenciamento de estado adequado (local vs. global vs. server)
- [ ] Sem prop drilling excessivo (> 3 níveis)
- [ ] Barrel exports (index.ts) em cada feature
- [ ] Imports respeitam as camadas (features/ não importa de pages/)
- [ ] Sem `any` no TypeScript (ou justificativa documentada)
- [ ] Constantes extraídas (sem magic numbers/strings)
- [ ] Tratamento de erro em todas as chamadas de API
- [ ] Loading states e empty states implementados
- [ ] `key` prop correta em listas (nunca usar index como key em listas dinâmicas)

### Performance

- [ ] Lazy loading de rotas e componentes pesados
- [ ] Imagens otimizadas (WebP/AVIF, `loading="lazy"`, `width`/`height` definidos)
- [ ] Bundle analisado (sem dependências desnecessárias ou duplicadas)
- [ ] `useMemo` / `useCallback` em cálculos caros e callbacks estáveis
- [ ] Sem re-renders desnecessários (verificar com React DevTools Profiler)
- [ ] Fontes otimizadas (`font-display: swap`, preload, subset)
- [ ] Core Web Vitals dentro das metas (LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms)
- [ ] Assets estáticos servidos via CDN com cache headers
- [ ] Code splitting efetivo (vendor chunks separados)
- [ ] Preconnect/dns-prefetch para domínios externos

### Acessibilidade

- [ ] HTML semântico (header, nav, main, article, section, footer)
- [ ] Hierarquia de headings correta (h1 único, sem pular níveis)
- [ ] Todos os formulários com labels associados
- [ ] Alt text descritivo em todas as imagens significativas
- [ ] `aria-hidden="true"` em ícones decorativos
- [ ] Focus visible em todos os elementos interativos
- [ ] Navegação por teclado funcional (Tab, Enter, Escape)
- [ ] Focus trap em modais e drawers
- [ ] Contraste mínimo AA (4.5:1 para texto, 3:1 para elementos gráficos)
- [ ] Live regions para conteúdo dinâmico (aria-live)
- [ ] Testes com axe-core passando sem violações
- [ ] Testado com leitor de tela (NVDA ou VoiceOver)

### Responsividade

- [ ] Funciona em mobile (320px mínimo), tablet e desktop
- [ ] Breakpoints consistentes com o design system
- [ ] Sem scroll horizontal indesejado
- [ ] Touch targets mínimo 44x44px em mobile
- [ ] Imagens responsivas com `srcset` / `sizes`
- [ ] Texto legível sem zoom (mínimo 16px para corpo)
- [ ] Testado em landscape e portrait

### SEO (se aplicável)

- [ ] `<title>` único e descritivo em cada página
- [ ] `<meta name="description">` em cada página
- [ ] `<link rel="canonical">` em cada página
- [ ] Open Graph e Twitter Card configurados
- [ ] Structured data (JSON-LD) para conteúdo relevante
- [ ] Sitemap.xml gerado e atualizado
- [ ] robots.txt configurado
- [ ] Heading hierarchy correta
- [ ] URLs amigáveis e descritivas

### Segurança

- [ ] Sem dados sensíveis no client-side (chaves de API, secrets)
- [ ] Inputs sanitizados (DOMPurify se renderizar HTML)
- [ ] Validação tanto no client quanto no server
- [ ] CSP headers configurados
- [ ] Tokens de autenticação em cookies HttpOnly (não localStorage)
- [ ] SRI em scripts de terceiros
- [ ] `rel="noopener noreferrer"` em links externos com `target="_blank"`
- [ ] Sem `eval()` ou `new Function()` com input do usuário
- [ ] Dependências atualizadas e sem vulnerabilidades (`npm audit`)

### Testes

- [ ] Testes unitários para componentes críticos e funções utilitárias
- [ ] Testes de integração para fluxos principais
- [ ] Testes E2E para fluxos críticos de negócio
- [ ] Testes de acessibilidade automatizados (axe-core)
- [ ] Coverage mínimo definido e atingido (meta: 80%)
- [ ] Testes passando no CI antes de merge
- [ ] Mocks realistas (MSW para API)

### DevEx & Qualidade de Código

- [ ] ESLint configurado e sem warnings ignorados
- [ ] Prettier configurado para formatação consistente
- [ ] Husky + lint-staged para checks pre-commit
- [ ] CI/CD rodando lint, types, testes e build
- [ ] README documentando setup, scripts e convenções
- [ ] Storybook para componentes do design system (se aplicável)
- [ ] Sem `console.log` em produção (regra de lint ou build strip)
- [ ] Error boundaries configurados para falhas graceful

---

> **Última atualização**: Junho de 2026
