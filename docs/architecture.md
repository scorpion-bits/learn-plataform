# Arquitetura

> Fonte de verdade técnica. Mudanças estruturais exigem ADR em `docs/decisions.md`.

## 1. Visão geral

```text
                ┌─────────────────────── Vercel ───────────────────────┐
 Browser ──────▶│  Next.js 16 (App Router, TS)                         │
                │   ├─ src/proxy.ts  → renova sessão, redireciona       │
                │   ├─ Server Components → leitura (RLS do usuário)     │
                │   ├─ Server Actions   → mutações (zod + guard + RLS)  │
                │   └─ Route Handlers   → /api/webhooks/abacatepay      │
                └───────────┬─────────────────────────────┬────────────┘
                            │ anon key + cookie JWT        │ service role (server-only)
                            ▼                              ▼
                ┌──────────────── Supabase ───────────────────────────┐
                │ Auth (email/senha)                                  │
                │ Postgres + RLS + funções SQL (is_admin,             │
                │   has_course_access, fulfill_order, métricas)       │
                │ Storage: course-covers (público), course-content    │
                │   (privado, signed URLs)                            │
                └─────────────────────────────────────────────────────┘
                            ▲
                AbacatePay ─┘ webhook (HMAC) → /api/webhooks/abacatepay
```

Princípios:
1. **Autorização mora no banco** (RLS + funções). Guards no servidor Next são a segunda camada; o client é só UX.
2. **Leitura em Server Components** com o client do usuário (RLS aplica). **Mutação em Server Actions** com validação `zod`, guard (`requireUser`/`requireAdmin`) e client do usuário. O **service role** só é usado no webhook de pagamento e em tarefas administrativas que não podem ser expressas por RLS — sempre em módulos com `import 'server-only'`.
3. **Sem camada de API REST própria** para o app: Server Actions + RLS bastam. Route Handlers só para webhooks e arquivos.
4. **Percepção de velocidade**: `loading.tsx` com skeletons por segmento, `<Link prefetch>`, `useOptimistic`/`useTransition` para ações (concluir aula, publicar curso), streaming com `<Suspense>` para blocos lentos (métricas).

## 2. Estrutura de pastas (alvo)

```text
/
├─ CLAUDE.md · MASTER_PLAN.md · docs/
├─ public/brand/            # logo, cubos, favicon, og (copiados do site SB)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/           # SQL versionado, único caminho de mudança no banco
│  ├─ tests/                # pgTAP (RLS/permissões)
│  └─ seed.sql              # dados de desenvolvimento
├─ src/
│  ├─ proxy.ts              # (Next 16: substitui middleware.ts)
│  ├─ app/
│  │  ├─ (public)/          # landing, /cursos, /cursos/[slug]
│  │  ├─ (auth)/            # /entrar, /cadastro, /recuperar-senha, /redefinir-senha
│  │  ├─ (student)/         # /inicio, /minha-biblioteca, /aprender/[courseSlug]/[lessonId], /conta
│  │  ├─ (checkout)/        # /checkout/[courseSlug], /checkout/pedido/[orderId]
│  │  ├─ admin/             # /admin, /admin/cursos/..., /admin/alunos/..., /admin/pedidos
│  │  ├─ api/webhooks/abacatepay/route.ts
│  │  └─ auth/callback/route.ts
│  ├─ components/
│  │  ├─ ui/                # primitivas (Button, Field, Dialog, Toast, Skeleton…)
│  │  ├─ brand/             # IsoBackdrop, IsoCube, ChamferCard, Logo…
│  │  ├─ layout/            # PublicShell, StudentShell, AdminShell
│  │  └─ <domínio>/         # course/, player/, admin/…
│  ├─ features/             # lógica por domínio: queries.ts (leitura), actions.ts (server actions), schemas.ts (zod)
│  │  ├─ auth/ courses/ curriculum/ enrollments/ progress/ orders/ admin-metrics/
│  ├─ lib/
│  │  ├─ supabase/{browser,server,service}.ts
│  │  ├─ auth/dal.ts        # getSession, requireUser, requireAdmin (React cache)
│  │  ├─ payments/abacatepay.ts (server-only)
│  │  ├─ env.ts             # validação de env com zod
│  │  └─ utils/
│  ├─ styles/{tokens.css,base.css}
│  └─ types/database.ts     # gerado: supabase gen types
└─ tests/e2e/               # Playwright
```

Regra: componentes de página não chamam Supabase diretamente — chamam `features/<x>/queries.ts`. Isso mantém as queries revisáveis em um lugar.

## 3. Rotas e proteção

| Grupo | Rotas | Quem | Proteção |
|---|---|---|---|
| public | `/`, `/cursos`, `/cursos/[slug]`, `/termos`, `/privacidade` | todos | — (RLS limita a cursos publicados) |
| auth | `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | anônimos | proxy redireciona logados |
| student | `/inicio`, `/minha-biblioteca`, `/aprender/...`, `/conta` | logado | proxy (sessão) + `requireUser()` no layout + RLS (`has_course_access`) |
| checkout | `/checkout/...` | logado | idem + validação de pedido do próprio usuário |
| admin | `/admin/**` | admin | proxy (sessão) + `requireAdmin()` no layout **e em cada Server Action** + RLS (`is_admin()`) |
| api | `/api/webhooks/abacatepay` | AbacatePay | segredo + HMAC; sem sessão |

O proxy **não** consulta papel no banco a cada request (custo); ele garante sessão válida e redireciona anônimos. O papel é checado no layout/ação (`requireAdmin`, cacheado por request) e no banco.

## 4. Fluxos principais

### Cadastro / login
1. `/cadastro` → Server Action `signUp` (zod) → `supabase.auth.signUp` (sem `role` em metadata; apenas `full_name`).
2. Trigger `on_auth_user_created` cria `profiles` e `user_roles(role='student')`.
3. Confirmação de email (se habilitada) → `/auth/callback` troca code por sessão → redirect para `next` **validado** (apenas paths relativos internos).
4. Login → `signInWithPassword` → redirect por papel (`/admin` ou `/inicio`).

### Compra (PIX transparente — ADR-018)
1. `/cursos/[slug]` → CTA "Comprar" (logado; senão `/entrar?next=`).
2. `/checkout/[slug]` coleta CPF/telefone → Server Action `startCheckout`:
   - verifica curso publicado com preço > 0 e que o usuário ainda não tem acesso;
   - reaproveita pedido `pending` não expirado do mesmo usuário/curso (idempotência de clique duplo);
   - cria `orders(status='pending', amount_cents=preço atual)` → `POST /v2/transparents/create` (amount do pedido, `externalId = order.id`) → salva `provider_billing_id`, `pix_br_code`, `pix_br_code_base64`, `expires_at` → redireciona para `/checkout/pedido/[orderId]`.
3. `/checkout/pedido/[orderId]` mostra o **QR PIX + copia-e-cola** e contagem até expirar, com polling do status do pedido. **Não concede nada.**
4. Webhook `transparent.completed` → `webhookSecret` + HMAC (integridade) → dedupe → **reconsulta obrigatória** `GET /v2/transparents/check` = PAID → `fulfill_order()` (transação: `paid`, `paid_at`, cria `enrollment(source='purchase')`) → página vê `paid` e mostra "Acessar curso".
5. Expiração: não há evento — job/reconsulta marca `expired`; UI oferece gerar novo QR.
6. Reembolso: aluno solicita até `paid_at + 7 dias` (CDC, ADR-017); admin executa (`POST /v2/transparents/refund`); `transparent.refunded` → `refunded` + revogação da matrícula.

### Atribuição manual (admin)
`/admin/alunos/[id]` → "Atribuir curso" → Server Action `grantCourse` (`requireAdmin` + RLS `is_admin`) → `enrollments(source='admin_grant', granted_by)`. "Remover" → `revoked_at/by/reason` apenas na concessão admin. Revogar compra = ação separada e explícita (reembolso), com motivo obrigatório.

### Consumo do curso e progresso
1. `/minha-biblioteca` lista cursos com acesso (com selos origem/estado), ordenados por último acesso.
2. `/aprender/[courseSlug]` → redireciona para a aula de retomada (última `updated_at` ou primeira não concluída).
3. `/aprender/[courseSlug]/[lessonId]` → layout com ementa lateral (drawer no mobile), conteúdo da aula (materiais renderizados por tipo), anterior/próxima, "Concluir aula" (optimistic) → `lesson_progress`.
4. Ao abrir a aula: upsert de `lesson_progress.updated_at` (sem completar) para retomada.

## 5. Ambientes
- `local`: Supabase CLI (Docker) + `next dev`. Sem Docker: projeto Supabase de desenvolvimento dedicado.
- `preview`: deploys de PR no Vercel apontando para Supabase **staging**.
- `production`: Vercel prod + Supabase prod. Migrations aplicadas via `supabase db push` (manual/CI com aprovação).

## 6. Variáveis de ambiente
| Nome | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | público |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client+server | anon/publishable key (pública; segurança vem de RLS) |
| `SUPABASE_SECRET_KEY` | **server only** | service role — nunca prefixar com `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | server | base para callbacks/returnUrl |
| `ABACATEPAY_API_KEY` | server only | |
| `ABACATEPAY_WEBHOOK_SECRET` | server only | segredo da URL do webhook — **única prova de origem**; nunca logar a URL do webhook |

A chave do HMAC (`X-Webhook-Signature`) da AbacatePay é **pública** e vira constante em `src/lib/payments/` (PAY-003), não env.

Validação lazy com zod: `@/lib/env/client` (`getClientEnv()`, NEXT_PUBLIC_* referenciadas literalmente) e `@/lib/env/server` (`import 'server-only'`). `@/lib/env` reexporta **apenas** o cliente — secrets exigem import explícito do módulo server.
