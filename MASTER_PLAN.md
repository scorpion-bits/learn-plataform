# MASTER PLAN — Scorpion Bits Learn

> Documento central de execução. **Sempre reflete o estado real do projeto.**
> Mantido pelo Tech Lead/orquestrador. Agentes leem, não editam status (exceto quando instruídos).
> Última atualização: **2026-10-08** — PHASE 0 concluída e aprovada; Onda 1 em andamento.

Leitura obrigatória para qualquer agente: `CLAUDE.md` → este arquivo → `docs/*` relevantes à tarefa.

---

## 0. Status rápido

| item | estado |
|---|---|
| Fase atual | **PHASE 1 — FOUNDATION** (+ PHASE 3 iniciada) |
| Próximas tarefas READY | — |
| Em andamento | `UI-004` (A03, Sonnet 5.5), `DB-003` (A02, Opus 5.5) |
| Bloqueios | — |

---

## 1. Visão do produto

**Objetivo.** Plataforma de cursos online da Scorpion Bits, começando por **desenvolvimento de jogos**. Substitui o projeto antigo (loja de PDFs "KodaBooks/Learn").

**Público.** Iniciantes e intermediários que querem criar jogos (alunos do GameLab/SESC, comunidade do estúdio); depois, devs em geral.

**Proposta.** Aprender game dev com quem faz jogos — conteúdo estruturado (curso → módulos → aulas → materiais), progresso persistente, experiência visual de estúdio de jogos (isométrica, identidade Scorpion Bits).

**Escopo do MVP.** Uso completo pelo celular (mobile-first + PWA instalável — ADR-019).

- Admin: dashboard com métricas essenciais; cursos (CRUD, publicar), ementa (módulos/aulas, reordenar), materiais (vídeo embed, texto markdown, arquivo para download, link); alunos (busca, perfil, atribuir/revogar curso); pedidos.
- Aluno: landing, catálogo público, página pública do curso, cadastro/login, biblioteca (comprados vs atribuídos, andamento, concluídos), player com navegação/retomada/progresso.
- Pagamento: AbacatePay (PIX; cartão se disponível) com webhook verificado e concessão idempotente.

**Fora do MVP (não construir agora)** — lista completa com motivos em `docs/post-mvp.md`. Cursos gratuitos, cupons, assinaturas, trilhas/bundles, certificados, comentários/fórum, avaliações, quizzes/exercícios corrigidos, slides HTML interativos (ADR-010), upload de vídeo próprio (ADR-011), OAuth social, gamificação (XP/badges), multi-idioma, app mobile, múltiplos instrutores, notificações por email além das do Supabase Auth, tema claro.

---

## 2. Estado atual

Detalhes: `docs/audit.md`.

- **Este repo**: vazio. Tudo será construído aqui.
- **Learn antigo** (Next 16 JS + Supabase + AbacatePay v1): funciona parcialmente, mas com **falhas críticas de segurança** — qualquer um vira admin no cadastro (S1) ou editando o próprio perfil (S2); middleware inativo (S3); conteúdo pago com cache público (S4); webhook confia no payload e não é atômico (S6/S7). Schema com drift (tabelas usadas que não existem nas migrations). Progresso em `localStorage`. Visual genérico índigo.
- **Reaproveitar**: padrão de clients `@supabase/ssr` + `getClaims`, hierarquia curso/módulo/aula, ideias do player, validação CPF/telefone, assets e tokens do site Scorpion Bits.
- **Descartar**: e-books, playlists, materiais avulsos, checkout polimórfico, `globals.css` de 3k linhas, `react-pdf`, escrita admin pelo client, migrations antigas.

---

## 3. Arquitetura (resumo)

Detalhes: `docs/architecture.md`, decisões: `docs/decisions.md`.

| camada | escolha |
|---|---|
| Frontend | Next.js 16 App Router, React 19, **TypeScript strict** (ADR-002), CSS Modules + tokens (ADR-003) |
| Backend | Server Components (leitura) + Server Actions (mutação, zod) + Route Handler só p/ webhook |
| Banco | Supabase Postgres, migrations versionadas, RLS em tudo, funções `is_admin`, `has_course_access`, `fulfill_order` |
| Auth | Supabase Auth email/senha, `src/proxy.ts` + DAL (`requireUser/requireAdmin`), papéis em `user_roles` (ADR-005) |
| Autorização | 3 camadas: RLS → guards no servidor → UI (`docs/authorization.md`) |
| Storage | `course-covers` público; `course-content` privado com signed URLs curtas (ADR-009) |
| Pagamentos | AbacatePay; `orders` + `payment_events`; acesso só via webhook verificado + `fulfill_order` atômico (ADR-008) |
| Hospedagem | Vercel (prod + previews), Supabase (prod + staging) |
| Testes | Vitest (unit), pgTAP (RLS), Playwright (e2e), CI GitHub Actions |

---

## 4. Modelo de dados (resumo)

Detalhes: `docs/database.md`.

```text
auth.users
 ├── profiles            (1:1)  nome, avatar, cpf/telefone privados
 ├── user_roles          (1:N)  admin | student   ← só service role escreve
 ├── enrollments         (N)    → courses   source: purchase | admin_grant · order_id? · revoked_at?
 ├── orders              (N)    → courses   amount_cents congelado · status · provider_billing_id
 │    └── payment_events (N)    eventos brutos do AbacatePay (dedupe por id)
 └── lesson_progress     (N)    → lessons   completed_at · last_position · updated_at

categories ─< courses ─< course_modules ─< lessons ─< lesson_materials
                                                       type: video | text | file | link
```

Acesso efetivo ao curso = existe `enrollment` não revogada (qualquer origem) **ou** admin.

---

## 5. Roadmap

Detalhes e ondas de paralelismo: `docs/roadmap.md`.

```text
PHASE 0  AUDIT                       ✅
PHASE 1  FOUNDATION                  ARCH-001..004
PHASE 2  DATA & SECURITY CORE        DB-001..005          ┐ em paralelo
PHASE 3  DESIGN SYSTEM               UI-001..005          ┘
PHASE 4  AUTH                        AUTH-001..004
PHASE 5  ADMIN — CONTEÚDO            ADMIN-002..004
PHASE 6  STUDENT                     STUDENT-001..007
PHASE 7  PAYMENTS                    PAY-001 (já na fase 1) · PAY-002..005
PHASE 8  ADMIN — PESSOAS & MÉTRICAS  DB-006 · ADMIN-001, 005..008
PHASE 9  UX / PERFORMANCE            UX-001..004
PHASE 10 QA                          QA-001..004
PHASE 11 RELEASE                     REL-001..003
```

Mudança em relação à hipótese inicial: **conteúdo admin vem antes da área do aluno** (o aluno precisa de cursos para existir), e **pagamentos vêm depois do player** (comprar algo que não se consegue consumir não serve). A pesquisa de pagamentos (`PAY-001`) começa já para eliminar risco cedo.

---

## 6. Backlog

Legenda — **Status**: `BACKLOG` (dependências abertas) · `READY` · `IN PROGRESS` · `REVIEW` · `DONE` · `BLOCKED`.
**Prioridade**: P0 (bloqueia MVP/segurança) · P1 (MVP) · P2 (desejável no MVP) · P3 (pós-MVP).
**Modelos**: Opus 5.5 (`claude-opus-5-5`), Sonnet 5.5 (`claude-sonnet-5-5`), Haiku 5.5 (`claude-haiku-5-5`).

### FOUNDATION

#### ARCH-001 — Scaffold do projeto Next.js 16 + TypeScript
- **Descrição**: criar app Next 16 (App Router, `src/`), TS strict, ESLint (config next), Prettier, alias `@/*`, estrutura de pastas de `docs/architecture.md` §2 (pastas vazias com `.gitkeep` onde fizer sentido), `src/lib/env.ts` (zod, separa server/client), `.env.example`, `.nvmrc` (22), scripts `dev/build/start/lint/typecheck/format`. Página `/` placeholder.
- **Objetivo**: base executável e padronizada para todos os agentes.
- **Prioridade**: P0 · **Fase**: 1 · **Dependências**: —
- **Arquivos**: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/env.ts`, `.env.example`, `.gitignore`
- **Critérios de aceitação**: `npm run build`, `lint`, `typecheck` passam; nenhuma dependência além de next/react/react-dom/zod/server-only + dev tooling; `env.ts` falha com mensagem clara se variável obrigatória faltar (server) sem quebrar o build quando a var é só de runtime; README atualizado com setup.
- **Status**: DONE ✅ · **Agente**: A01 Foundation · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### ARCH-002 — Supabase CLI, clients e tipos
- **Descrição**: `supabase init` (config.toml), pastas `migrations/`, `tests/`, `scripts/`, `seed.sql` vazio; `src/lib/supabase/{browser,server,service}.ts` (service com `import 'server-only'`), script `db:types`, `src/types/database.ts` placeholder; `docs/development.md` revisado.
- **Prioridade**: P0 · **Fase**: 1 · **Dependências**: ARCH-001
- **Arquivos**: `supabase/**`, `src/lib/supabase/*`, `package.json`
- **Critérios**: dividir `getServerEnv()` por domínio (ex.: `getSupabaseServerEnv()` e `getPaymentsEnv()`) para que o Supabase funcione sem as chaves de pagamento configuradas (achado na revisão do ARCH-001); clients tipados com `Database`; service client impossível de importar em client component (build quebra); nenhuma chave secreta com prefixo `NEXT_PUBLIC_`.
- **Status**: DONE ✅ · **Agente**: A01 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### ARCH-003 — CI (GitHub Actions)
- **Descrição**: workflow em PR/push: install (cache), lint, typecheck, test (quando existir), build com envs dummy.
- **Prioridade**: P1 · **Fase**: 1 · **Dependências**: ARCH-001
- **Arquivos**: `.github/workflows/ci.yml`
- **Critérios**: CI verde no PR; tempo < 5 min.
- **Status**: DONE ✅ · **Agente**: A01 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

#### ARCH-004 — Vercel + ambientes
- **Descrição**: `vercel.json` se necessário, documentação de envs por ambiente (prod/preview), headers de segurança básicos (`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`) em `next.config.ts`.
- **Prioridade**: P1 · **Fase**: 1 · **Dependências**: ARCH-001 · **Requer humano**: criar projetos Vercel/Supabase e configurar envs.
- **Critérios**: preview deploy funciona; headers presentes.
- **Status**: BACKLOG · **Agente**: A01 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

### DATABASE

#### DB-001 — Schema de conteúdo e identidade
- **Descrição**: migration com enums (`app_role`, `course_level`, `course_status`, `material_type`), `set_updated_at()`, `profiles`, `user_roles`, `categories`, `courses`, `course_modules`, `lessons`, `lesson_materials`, triggers de denormalização de `course_id`, índices e constraints conforme `docs/database.md` §3.
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: ARCH-002
- **Arquivos**: `supabase/migrations/20261008000001_core_schema.sql`
- **Critérios**: `supabase db reset` aplica sem erro; constraints por tipo de material; `position` único deferrable; RLS **habilitada** (policies vêm no DB-003 — tabelas ficam fechadas até lá).
- **Status**: DONE ✅ · **Agente**: A02 Database & Security · **Modelo**: Opus 5.5 · **Esforço**: alto

#### DB-002 — Schema de acesso, comércio e progresso
- **Descrição**: enums (`enrollment_source`, `order_status`, `order_source`), `orders`, `payment_events`, `enrollments`, `lesson_progress` com checks e índices parciais.
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-001
- **Arquivos**: `supabase/migrations/20261008000002_access_commerce.sql`
- **Critérios**: impossível ter 2 matrículas ativas da mesma origem; `purchase` exige `order_id`; `admin_grant` exige `granted_by`; um pedido pendente por usuário+curso.
- **Status**: DONE ✅ · **Agente**: A02 · **Modelo**: Opus 5.5 · **Esforço**: alto

#### DB-003 — RLS, funções de segurança e trigger de cadastro
- **Descrição**: `is_admin()`, `has_course_access()`, `handle_new_user()` (ignora metadata.role; cria profile + role student), column grants em `profiles`, todas as policies da matriz em `docs/authorization.md`, views `course_catalog`, `course_outline`, `my_library` (security_invoker), `fulfill_order()` (só service role), funções de reorder; `revoke execute` de anon/public onde aplicável; script `supabase/scripts/grant-admin.sql`.
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-001, DB-002
- **Arquivos**: `supabase/migrations/20261008000003_rls_functions.sql`, `supabase/scripts/grant-admin.sql`
- **Critérios**: matriz de RLS implementada 1:1; todas as `security definer` com `search_path=''`; Supabase advisor (lint) sem alertas de segurança.
- **Status**: IN PROGRESS · **Agente**: A02 · **Modelo**: Opus 5.5 · **Esforço**: alto

#### DB-004 — Storage buckets e policies
- **Descrição**: buckets `course-covers` (público, 5 MB, imagens) e `course-content` (privado, 200 MB, zip/imagens/áudio/arquivos de projeto), policies admin-only de escrita; helper server-side `getSignedMaterialUrl(materialId)` que checa acesso.
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-003
- **Arquivos**: `supabase/migrations/20261008000004_storage.sql`, `src/features/materials/storage.ts`
- **Critérios**: student não lista nem baixa `course-content` direto; signed URL ≤ 10 min; respostas com `private, no-store`.
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### DB-005 — Testes de RLS (pgTAP)
- **Descrição**: suíte em `supabase/tests/` cobrindo anon / student sem acesso / student com acesso / student com acesso revogado / admin para cada tabela, bucket e função; inclui tentativas de ataque (auto-promoção, inserir enrollment, ler materiais pagos, alterar pedido, chamar `fulfill_order`).
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-003, DB-004
- **Critérios**: `npm run db:test` verde; cada linha da matriz tem ao menos 1 teste; ataques S1/S2/S8 do audit falham.
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### DB-006 — Métricas do admin
- **Descrição**: `admin_dashboard_metrics(from, to)` (receita, nº vendas, ticket médio, alunos totais/novos, matrículas por origem, top 5 cursos) + `admin_revenue_by_day(from,to)` + view `admin_students`; todas checam `is_admin()`.
- **Prioridade**: P1 · **Fase**: 8 · **Dependências**: DB-005
- **Critérios**: student recebe erro/zero linhas; testes pgTAP; consultas < 200 ms com 10k pedidos (índices).
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### DB-008 — Exclusão de conta e anonimização (LGPD)
- **Descrição**: `orders` usa `on delete restrict` para o comprador (registro financeiro), então excluir a conta de quem comprou é bloqueado. Definir processo: anonimizar `profiles` (nome/CPF/telefone), desativar login no Auth, manter `orders` com referência pseudonimizada. Mesmo para admins com histórico de concessões.
- **Prioridade**: P2 · **Fase**: 10 · **Dependências**: DB-005 · **Requer humano**: validação jurídica
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### DB-007 — Seed de desenvolvimento
- **Descrição**: `seed.sql` com categorias, 2 cursos (1 publicado completo com 3 módulos/10 aulas/materiais de cada tipo, 1 rascunho), usuários admin/aluno de teste (somente local).
- **Prioridade**: P2 · **Fase**: 2 · **Dependências**: DB-003
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

### DESIGN SYSTEM

#### UI-001 — Tokens, fontes, base e assets de marca
- **Descrição**: copiar assets do site SB para `public/brand/` (logo, logo-mark, glyph, poster, cubos, favicon, og) e fontes para `src/app/fonts/`; `next/font/local` (Grotesk, Inter); `tokens.css` e `base.css` conforme `docs/design-system.md` §2–3; `IsoBackdrop`; favicon/metadata padrão; suporte a `prefers-reduced-motion` e "modo leve".
- **Prioridade**: P0 · **Fase**: 3 · **Dependências**: ARCH-001
- **Arquivos**: `public/brand/*`, `src/app/fonts/*`, `src/styles/*`, `src/components/brand/IsoBackdrop/*`, `src/app/layout.tsx`
- **Critérios**: zero requisições a Google Fonts; CLS ~0 por fontes; página placeholder já com identidade SB; assets otimizados (sem o `.webm` de 4 MB fora da landing).
- **Status**: DONE ✅ · **Agente**: A03 Design System · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### UI-002 — Primitivas de UI
- **Descrição**: componentes de `docs/design-system.md` §5 com CSS Modules, acessíveis, com estados (hover/focus/active/disabled/pending/error).
- **Prioridade**: P0 · **Fase**: 3 · **Dependências**: UI-001
- **Critérios**: navegação por teclado completa; foco visível; `Button` com `pending` evita clique duplo; `Toast` com `aria-live`; testes Vitest básicos de comportamento (Dialog/Toast/Button).
- **Status**: DONE ✅ · **Agente**: A03 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### UI-004 — Componentes de assinatura isométricos
- **Descrição**: `IsoCube` (SVG), `CubeProgress`, `ChamferCard`, `IsoCover`, `Logo`, `Dock` (§4).
- **Prioridade**: P1 · **Fase**: 3 · **Dependências**: UI-001 (paralelo a UI-002)
- **Critérios**: SVG leve (sem imagens raster para cubos); `CubeProgress` com `role="progressbar"` e `aria-valuenow`; animações desligadas em reduced-motion; responsivo até 360px.
- **Status**: IN PROGRESS · **Agente**: A03 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### UI-003 — Shells de layout
- **Descrição**: `PublicShell` (Dock + footer), `StudentShell` (Dock com menu do usuário), `PlayerShell` (topo/ementa/drawer), `AdminShell` (sidebar colapsável/drawer + breadcrumbs).
- **Prioridade**: P0 · **Fase**: 3 · **Dependências**: UI-002, UI-004
- **Critérios**: mover `IsoBackdrop` do root layout para os layouts dos route groups (`full` em público/aluno, `subtle` no admin); landmarks corretos; skip-link; menus acessíveis; funcionam em 360/768/1024/1440.
- **Status**: BACKLOG · **Agente**: A03 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### UI-006 — Ícones de app e manifest
- **Descrição**: PWA instalável (ADR-019): ícones quadrados 180/192/512 + maskable a partir do glyph, `manifest.webmanifest` (`display: standalone`, `start_url: /inicio`, cores da marca), apple-touch-icon, `viewport-fit=cover` + safe-area. Sem service worker offline no MVP.
- **Prioridade**: P1 · **Fase**: 3 · **Dependências**: UI-001
- **Status**: BACKLOG · **Agente**: A03 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

#### UI-005 — Vitrine `/dev/ui`
- **Descrição**: página (somente em dev/preview) mostrando todos os componentes e estados.
- **Prioridade**: P2 · **Fase**: 3 · **Dependências**: UI-002, UI-004
- **Status**: BACKLOG · **Agente**: A03 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

### AUTH

#### AUTH-001 — Proxy e sessão
- **Descrição**: `src/proxy.ts` (Next 16) com `updateSession`, matcher excluindo estáticos, redireciono de anônimos em rotas protegidas com `next` seguro, redireciono de logados fora de `/entrar`/`/cadastro`.
- **Prioridade**: P0 · **Fase**: 4 · **Dependências**: ARCH-002, DB-003
- **Critérios**: sessão renovada; nenhuma consulta ao banco no proxy; open redirect impossível (teste unitário do sanitizador).
- **Status**: BACKLOG · **Agente**: A04 Auth · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### AUTH-002 — DAL e guards
- **Descrição**: `src/lib/auth/dal.ts` (`getCurrentUser`, `getCurrentRole`, `requireUser`, `requireAdmin`) com `React.cache`; helper `adminAction()`/`userAction()` que compõe guard + zod + resultado tipado.
- **Prioridade**: P0 · **Fase**: 4 · **Dependências**: AUTH-001
- **Critérios**: `requireAdmin` usa `user_roles` (banco), nunca metadata/cookie; testes unitários com mocks; documentação em `docs/authentication.md` atualizada.
- **Status**: BACKLOG · **Agente**: A04 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### AUTH-003 — Telas de autenticação
- **Descrição**: `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/auth/callback` com Server Actions, `useActionState`, mensagens pt-BR, estados pending.
- **Prioridade**: P0 · **Fase**: 4 · **Dependências**: AUTH-002, UI-003
- **Critérios**: cadastro nunca envia `role`; erros genéricos de login; redirect pós-login por papel; responsivo e acessível; ilustração SB.
- **Status**: BACKLOG · **Agente**: A04 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### AUTH-004 — Página "Minha conta"
- **Descrição**: editar nome e senha.
- **Prioridade**: P2 · **Fase**: 6 · **Dependências**: AUTH-003
- **Status**: BACKLOG · **Agente**: A04 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

### ADMIN

#### ADMIN-002 — Cursos: lista, criação, edição, publicação
- **Descrição**: `/admin/cursos` (tabela com status, preço, nº aulas, alunos), `/admin/cursos/novo`, `/admin/cursos/[id]` (aba Informações: título, slug auto, subtítulo, descrição md, categoria, nível, preço em R$→centavos, capa com upload e preview), publicar/despublicar com validações (tem ≥1 aula, preço > 0, capa).
- **Prioridade**: P0 · **Fase**: 5 · **Dependências**: AUTH-002, UI-003, DB-004
- **Critérios**: toda mutação via Server Action com `requireAdmin`+zod; slug único com erro amigável; feedback otimista em publicar; estados loading/empty/error.
- **Status**: BACKLOG · **Agente**: A05 Admin · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### ADMIN-003 — Editor de ementa (módulos e aulas)
- **Descrição**: aba Ementa: criar/renomear/excluir módulos e aulas, reordenar (botões ↑↓ acessíveis + drag opcional nativo), marcar preview, duração.
- **Prioridade**: P0 · **Fase**: 5 · **Dependências**: ADMIN-002
- **Critérios**: reordenação atômica via função SQL; confirmação antes de excluir; optimistic UI com rollback em erro.
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### ADMIN-004 — Editor de materiais da aula
- **Descrição**: na aula: adicionar/editar/remover/reordenar materiais `video` (URL → provider+id), `text` (markdown com preview), `file` (upload para `course-content` com progresso), `link`.
- **Prioridade**: P0 · **Fase**: 5 · **Dependências**: ADMIN-003
- **Critérios**: upload com barra de progresso e cancelamento; validação de tipo/tamanho no servidor; arquivo removido do storage ao excluir material.
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### ADMIN-001 — Dashboard
- **Descrição**: `/admin`: KPIs do período (7/30/90 dias), receita por dia, top cursos, últimos pedidos; streaming com Suspense.
- **Prioridade**: P1 · **Fase**: 8 · **Dependências**: DB-006, UI-003
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### ADMIN-005 — Alunos: lista e busca
- **Descrição**: `/admin/alunos` com busca (nome/email, debounce, URL state), paginação server-side.
- **Prioridade**: P1 · **Fase**: 8 · **Dependências**: DB-006, UI-003
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: baixo

#### ADMIN-006 — Perfil do aluno e atribuições
- **Descrição**: `/admin/alunos/[id]`: dados, matrículas com origem/estado/progresso, pedidos; "Atribuir curso" (combobox de cursos), "Remover atribuição" (motivo), "Revogar compra" (separado, motivo obrigatório).
- **Prioridade**: P0 · **Fase**: 8 · **Dependências**: ADMIN-005
- **Critérios**: remover atribuição nunca afeta matrícula `purchase`; histórico visível (revogadas em cinza).
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### ADMIN-007 — Pedidos
- **Descrição**: `/admin/pedidos` lista com filtros de status; detalhe com eventos do provedor; registrar venda manual.
- **Prioridade**: P1 · **Fase**: 8 · **Dependências**: PAY-003, UI-003
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Sonnet 5.5 · **Esforço**: baixo

#### ADMIN-008 — Alunos do curso
- **Descrição**: aba "Alunos" no curso: matriculados, origem, progresso.
- **Prioridade**: P2 · **Fase**: 8 · **Dependências**: ADMIN-006
- **Status**: BACKLOG · **Agente**: A05 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

### STUDENT

#### STUDENT-001 — Landing page
- **Descrição**: `/` com hero (escorpião/cubos), proposta, cursos em destaque (dados reais), sobre o estúdio/GameLab, CTA.
- **Prioridade**: P1 · **Fase**: 6 · **Dependências**: UI-003, DB-003
- **Critérios**: Lighthouse mobile ≥ 90 performance/a11y; LCP < 2.5 s; sem vídeo pesado acima da dobra no mobile.
- **Status**: BACKLOG · **Agente**: A06 Student XP · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### STUDENT-002 — Catálogo público
- **Descrição**: `/cursos` com filtros (categoria, nível) em URL, cards com capa/nível/aulas/duração/preço/selo "Na sua biblioteca" (se logado).
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: UI-004, DB-003
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### STUDENT-003 — Página pública do curso
- **Descrição**: `/cursos/[slug]`: IsoCover, descrição, ementa (acordeão), aulas preview abríveis, CTA contextual (Comprar / Continuar / Entrar para comprar), metadata/OG.
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: STUDENT-002
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### STUDENT-008 — Páginas legais e rodapé institucional
- **Descrição**: `/termos` (inclui política de reembolso de 7 dias), `/privacidade` (LGPD: dados coletados, CPF para pagamento), rodapé com razão social e **CNPJ** (exigência da AbacatePay para produção). Texto-base gerado e marcado para revisão jurídica.
- **Prioridade**: P0 (bloqueia produção) · **Fase**: 6 · **Dependências**: UI-003
- **Dados da empresa (recebidos 2026-10-08, cartão CNPJ)**: razão social **60.345.144 THALES MIGUEL HAJES** · CNPJ **60.345.144/0001-01** · empresário individual (ME) · CNAE principal 85.92-9-99 (ensino de arte e cultura), secundária 85.99-6-03 (treinamento em informática). Nome fantasia não registrado (exibir "Scorpion Bits" como marca + razão social). Centralizar em `src/config/company.ts`.
- **Endereço físico (Decreto 7.962/2013, art. 2º)**: Av. Paulino Rodella, 1234 — Parque Laranjeiras — Araraquara/SP — CEP 14801-515 (confirmado pelo produto para publicação).
- **Email público de contato/suporte**: scorpionbits.contato@gmail.com (confirmado pelo produto).
- **Termos/privacidade**: gerar texto-base (termos com reembolso de 7 dias — ADR-017; privacidade/LGPD com uso de CPF/telefone no pagamento) com aviso visível "pendente de revisão jurídica" no repositório (comentário/arquivo), **não** na página publicada; revisão por advogado antes do lançamento (REL-003).
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Haiku 5.5 · **Esforço**: baixo · **Requer humano**: revisão jurídica antes do lançamento

#### STUDENT-004 — Início e biblioteca do aluno
- **Descrição**: `/inicio` (continuar último curso + recomendações) e `/minha-biblioteca` (abas Em andamento/Concluídos/Todos, selo Comprado/Atribuído, `CubeProgress`).
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: STUDENT-007, AUTH-003
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### STUDENT-005 — Player: estrutura e navegação
- **Descrição**: `/aprender/[courseSlug]` (redireciona à aula de retomada) e `/aprender/[courseSlug]/[lessonId]` com `PlayerShell`, ementa com estado (atual/concluída/bloqueada), anterior/próxima, prefetch da próxima aula, atalhos de teclado, 404/403 elegantes.
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: UI-003, AUTH-002, ADMIN-004
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### STUDENT-006 — Renderizadores de materiais
- **Descrição**: `video` (embed lite: thumbnail → iframe on click, `youtube-nocookie`), `text` (markdown sanitizado), `file` (download via signed URL), `link` (card externo `rel="noopener"`).
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: STUDENT-005, DB-004
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### STUDENT-007 — Progresso
- **Descrição**: "Concluir aula" com `useOptimistic` + rollback; registro de "última aula visitada"; % do curso; estado "Curso concluído" com celebração isométrica discreta.
- **Prioridade**: P0 · **Fase**: 6 · **Dependências**: STUDENT-005
- **Status**: BACKLOG · **Agente**: A06 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

### PAYMENTS

#### PAY-001 — Spike: API AbacatePay
- **Descrição**: pesquisar documentação oficial atual e responder as 6 perguntas de `docs/payments.md`; atualizar o doc com endpoints, payloads de exemplo, verificação de assinatura e plano de testes em devMode. **Incluir estudo comparativo AbacatePay × Cakto (ADR-016)** com recomendação. **Sem código de produção.**
- **Prioridade**: P0 · **Fase**: 1 (paralelo) · **Dependências**: —
- **Arquivos**: `docs/payments.md`
- **Critérios**: cada pergunta respondida com link da fonte; incertezas explícitas.
- **Status**: DONE ✅ · **Agente**: A07 Payments · **Modelo**: Opus 5.5 · **Esforço**: médio

#### PAY-002 — Cliente AbacatePay + `startCheckout`
- **Descrição**: `src/lib/payments/abacatepay.ts` (server-only, tipado, timeouts, erros mapeados; contrato em `docs/payments.md` §2–3); Server Action `startCheckout(courseSlug, taxId, phone)` conforme `docs/architecture.md` §4 (PIX transparente, ADR-018); página `/checkout/[slug]`.
- **Prioridade**: P0 · **Fase**: 7 · **Dependências**: PAY-001, DB-005, AUTH-002, STUDENT-003
- **Critérios**: preço só do banco; reaproveita pedido pendente; bloqueia quem já tem acesso; CPF validado com dígito verificador; testes unitários com fetch mockado.
- **Status**: BACKLOG · **Agente**: A07 · **Modelo**: Opus 5.5 · **Esforço**: alto

#### PAY-003 — Webhook e concessão
- **Descrição**: `/api/webhooks/abacatepay` conforme `docs/payments.md` (segredo + HMAC no corpo bruto, dedupe, verificação, `fulfill_order`, códigos de resposta corretos).
- **Prioridade**: P0 · **Fase**: 7 · **Dependências**: PAY-002
- **Critérios**: testes cobrindo: assinatura inválida, evento duplicado, entregas concorrentes, valor divergente, pedido inexistente, reembolso; nenhum acesso concedido fora de `fulfill_order`.
- **Status**: BACKLOG · **Agente**: A07 · **Modelo**: Opus 5.5 · **Esforço**: alto

#### PAY-004 — Página de status do pedido
- **Descrição**: `/checkout/pedido/[orderId]` com QR PIX + copia-e-cola (botão copiar com feedback), contagem até expirar, polling, estados pending/paid/expired, CTA "Acessar curso" / "Gerar novo QR".
- **Prioridade**: P0 · **Fase**: 7 · **Dependências**: PAY-003
- **Status**: BACKLOG · **Agente**: A07 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### PAY-006 — Solicitação e execução de reembolso
- **Descrição**: aluno vê "Solicitar reembolso" em seus pedidos até `paid_at + 7 dias` (CDC, ADR-017) → `refund_requested_at`; admin vê a fila com % do curso consumido e executa `POST /v2/transparents/refund`; acesso revogado só quando chega `transparent.refunded`. Antiabuso: segundo reembolso do mesmo curso pelo mesmo aluno bloqueado.
- **Prioridade**: P1 · **Fase**: 7 · **Dependências**: PAY-003, ADMIN-007
- **Critérios**: aluno não consegue solicitar após 7 dias nem para pedido de outro usuário; falha `INSUFFICIENT_FUNDS` exibida ao admin; testes da action.
- **Status**: BACKLOG · **Agente**: A07 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### PAY-005 — Reconciliação e expiração
- **Descrição**: ação admin "Reconsultar pagamento"; expiração de pendentes (Vercel Cron diário).
- **Prioridade**: P2 · **Fase**: 8 · **Dependências**: PAY-003
- **Status**: BACKLOG · **Agente**: A07 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

### UX / PERFORMANCE

| ID | Título | Prior. | Dep. | Modelo | Esforço | Status |
|---|---|---|---|---|---|---|
| UX-001 | `loading.tsx`/skeletons por segmento, `error.tsx`, `not-found.tsx`, prefetch e transições | P1 | Fase 6 | Sonnet 5.5 | médio | BACKLOG |
| UX-002 | Auditoria de acessibilidade (axe + teclado + leitor de tela) e correções | P1 | Fase 6 | Sonnet 5.5 | médio | BACKLOG |
| UX-003 | Passe responsivo 360/390/768/1024/1440 em todas as telas | P1 | Fase 6 | Sonnet 5.5 | médio | BACKLOG |
| UX-004 | Performance: imagens (`next/image`), bundle analyzer, cache de leituras públicas | P2 | Fase 6 | Haiku 5.5 | baixo | BACKLOG |

Agente: A06 (UX-001/003/004) e A03 (UX-002). Critério comum: checklist de estados de `docs/design-system.md` §8 preenchido por tela. **Mobile (ADR-019)**: toda tela de aluno e admin utilizável por completo com toque em 360px.

### QA

| ID | Título | Prior. | Dep. | Modelo | Esforço | Status |
|---|---|---|---|---|---|---|
| QA-001 | Setup Playwright + integração no CI (Vitest já configurado no UI-002) | P1 | ARCH-003 | Sonnet 5.5 | baixo | BACKLOG |
| QA-002 | Revisão de segurança adversarial (actions, rotas, RLS, storage, headers, secrets) | P0 | PAY-003, ADMIN-006 | **Opus 5.5** | alto | BACKLOG |
| QA-003 | E2E dos fluxos críticos (cadastro→compra mock→acesso→progresso; admin cria curso; admin atribui/revoga) — rodando também em perfis de celular (Pixel/iPhone) | P0 | Fase 7 | Sonnet 5.5 | médio | BACKLOG |
| QA-004 | Teste de pagamento real em devMode/sandbox (roteiro manual + evidências) | P0 | PAY-004 | Sonnet 5.5 + humano | médio | BACKLOG |

Agente: A08 QA & Security.

### RELEASE

| ID | Título | Prior. | Dep. | Modelo | Esforço | Status |
|---|---|---|---|---|---|---|
| REL-001 | Setup de produção (Supabase prod, migrations, admin bootstrap, envs Vercel, webhook URL, domínio) | P0 | QA-002 | Haiku 5.5 + **humano** | baixo | BACKLOG |
| REL-002 | ~~Migração de dados do Learn antigo~~ | — | — | — | — | CANCELADA (Q1) |
| REL-003 | Checklist de lançamento (inclui revisão jurídica de termos/privacidade) e desativação do app antigo | P1 | REL-001 | Haiku 5.5 | baixo | BACKLOG |

---

## 7. Agentes

Regra de custo: Opus só onde um erro custa dinheiro/segurança ou afeta todo o sistema; Sonnet para features; Haiku para tarefas mecânicas. O orquestrador (este papel) revisa tudo; revisões de segurança usam Opus.

```text
AGENT A01 — FOUNDATION ENGINEER
Responsabilidade: scaffold, Supabase CLI/clients, CI, Vercel/headers.
Tarefas: ARCH-001, ARCH-002, ARCH-003, ARCH-004
Dependências: PHASE 0
Modelo: Sonnet 5.5 (ARCH-003/004: Haiku 5.5)
Esforço: médio (CI/Vercel: baixo)
Justificativa: configuração conhecida, mas define padrões que todos herdam — vale Sonnet com atenção.

AGENT A02 — DATABASE & SECURITY ENGINEER
Responsabilidade: schema, migrations, RLS, funções, storage, testes pgTAP, métricas SQL, seed.
Tarefas: DB-001..DB-007
Dependências: ARCH-002
Modelo: Opus 5.5 (DB-001..003) · Sonnet 5.5 (DB-004..006) · Haiku 5.5 (DB-007)
Esforço: alto (DB-007: baixo)
Justificativa: o banco é a fronteira de segurança real; os bugs do sistema antigo eram todos aqui.

AGENT A03 — DESIGN SYSTEM ENGINEER
Responsabilidade: identidade SB, tokens, fontes, primitivas, componentes isométricos, shells, a11y.
Tarefas: UI-001..UI-005, UX-002
Dependências: ARCH-001
Modelo: Sonnet 5.5 (UI-005: Haiku 5.5)
Esforço: alto em UI-001/UI-004 (qualidade visual é requisito central), médio no resto.
Justificativa: trabalho visual/criativo isolado do backend; Sonnet entrega bem com direção detalhada.

AGENT A04 — AUTHENTICATION ENGINEER
Responsabilidade: proxy, DAL/guards, telas de auth, conta.
Tarefas: AUTH-001..AUTH-004
Dependências: ARCH-002, DB-003, UI-003 (para telas)
Modelo: Sonnet 5.5 (AUTH-004: Haiku 5.5)
Esforço: alto em AUTH-001/002, médio em AUTH-003.
Justificativa: padrões bem documentados do Supabase SSR; a segurança dura está no banco (A02) e será revisada por A08.

AGENT A05 — ADMIN ENGINEER
Responsabilidade: painel admin (conteúdo, alunos, pedidos, dashboard).
Tarefas: ADMIN-001..ADMIN-008
Dependências: AUTH-002, UI-003, DB-004 (DB-006 para métricas)
Modelo: Sonnet 5.5 (ADMIN-008: Haiku 5.5)
Esforço: médio; alto em ADMIN-003/004 (reordenação e uploads).
Justificativa: CRUDs com UX caprichada; RLS já protege.

AGENT A06 — STUDENT EXPERIENCE ENGINEER
Responsabilidade: landing, catálogo, página do curso, biblioteca, player, progresso, UX/perf.
Tarefas: STUDENT-001..007, UX-001, UX-003, UX-004
Dependências: UI-003, AUTH-002, ADMIN-004
Modelo: Sonnet 5.5 (UX-004: Haiku 5.5)
Esforço: alto no player (STUDENT-005/006) e landing; médio no resto.
Justificativa: a experiência de aprender é o coração do produto.

AGENT A07 — PAYMENTS ENGINEER
Responsabilidade: AbacatePay, checkout, webhook, concessão, reconciliação.
Tarefas: PAY-001..PAY-005
Dependências: PAY-001 livre; demais após DB-005/AUTH-002/STUDENT-003
Modelo: Opus 5.5 (PAY-001..003) · Sonnet 5.5 (PAY-004/005)
Esforço: alto (PAY-001: médio)
Justificativa: dinheiro + idempotência + segurança de webhook — erro aqui é prejuízo direto.

AGENT A08 — QA & SECURITY REVIEWER
Responsabilidade: infraestrutura de testes, e2e, revisão adversarial final, teste de pagamento.
Tarefas: QA-001..QA-004
Dependências: conforme tarefas
Modelo: Opus 5.5 (QA-002) · Sonnet 5.5 (demais)
Esforço: alto (QA-002), médio (demais)
Justificativa: revisão de segurança exige o modelo mais capaz; testes são mecânicos.

A01 também executa REL-001/003 (Haiku).
```

---

## 8. Execução

### 8.1 Paralelismo
```text
                 ┌── PAY-001 (pesquisa)
ARCH-001 ────────┼── ARCH-002 ── DB-001 → DB-002 → DB-003 → DB-004 → DB-005 ──┐
                 ├── ARCH-003                                                  │
                 └── UI-001 ── UI-002 ∥ UI-004 ── UI-003 ──────────────────────┤
                                                                               ▼
                                        AUTH-001 → AUTH-002 → AUTH-003
                                                       │
                       ADMIN-002 → ADMIN-003 → ADMIN-004      STUDENT-001/002/003
                                                       │
            STUDENT-005 → 006 → 007 → 004   ∥   PAY-002 → PAY-003 → PAY-004
                                                       │
                   DB-006 → ADMIN-001 ∥ ADMIN-005 → 006 ∥ ADMIN-007 ∥ PAY-005
                                                       │
                              UX-001..004 → QA-002 ∥ QA-003 ∥ QA-004 → REL
```
Núcleos com dono único (nunca dois agentes ao mesmo tempo): `supabase/migrations/` (A02), `src/lib/auth/` + `src/proxy.ts` (A04), `src/styles/tokens.css` + `src/components/ui|brand` (A03), `src/lib/payments/` (A07).

### 8.2 Ciclo
`MASTER PLAN → BACKLOG → próxima tarefa READY → DELEGAR (bloco §8.4) → agente implementa em branch → REVIEW pelo orquestrador (código, banco, frontend, UX, performance, segurança) → testes → integrar → atualizar este arquivo (§10) → próxima`.
Nenhuma tarefa vira DONE porque o agente disse "terminei". Problemas encontrados em revisão viram tarefas `FIX-xxx`.

### 8.3 Checklist de revisão (orquestrador)
- Código: correto, consistente com `docs/architecture.md`, sem duplicação, sem abstração desnecessária, tipado.
- Banco: RLS correta e testada, índices, constraints, migrations reversíveis/idempotentes onde possível.
- Segurança: checklist "usuário malicioso" de `docs/authorization.md`.
- Frontend: responsivo, acessível, loading/empty/error/success.
- Performance: queries necessárias apenas, sem waterfall evitável, sem JS desnecessário no client.

### 8.4 Delegações prontas (Onda 1)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENT A01
FOUNDATION ENGINEER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK:
ARCH-001 — Scaffold do projeto Next.js 16 + TypeScript

MODEL: Sonnet 5.5 (claude-sonnet-5-5)
EFFORT: médio

CONTEXT:
Repo scorpion-bits/learn-plataform: nova plataforma de cursos da Scorpion Bits
(game dev). Repo hoje só tem docs. Leia CLAUDE.md, MASTER_PLAN.md,
docs/architecture.md (§2 estrutura, §6 envs), docs/decisions.md (ADR-002, 003, 013),
docs/development.md.

OBJECTIVE:
Criar a base Next.js 16 App Router + TypeScript strict pronta para os demais agentes.

DEPENDENCIES: nenhuma.

FILES:
package.json, package-lock.json, tsconfig.json, next.config.ts, eslint.config.mjs,
.prettierrc, .nvmrc, .gitignore, .env.example, src/app/layout.tsx, src/app/page.tsx,
src/lib/env.ts, README.md, pastas de docs/architecture.md §2 (com .gitkeep).

ACCEPTANCE CRITERIA:
- npm run build / lint / typecheck passam.
- Dependências: next@16, react@19, react-dom@19, zod, server-only; dev: typescript,
  @types/*, eslint, eslint-config-next, prettier. Nada além disso.
- src/lib/env.ts: schemas zod separados para server e client; erro claro em runtime
  quando falta variável; não exige secrets durante `next build`.
- .env.example com todas as variáveis de docs/architecture.md §6 (valores vazios).
- layout.tsx com lang="pt-BR", metadata básica; page.tsx placeholder simples
  (sem estilização elaborada — UI-001 cuidará disso).
- README com setup (aponta para docs/development.md).

DO NOT:
- Não instalar Tailwind, UI kits, Supabase (é ARCH-002), libs de estado/fetch.
- Não criar globals.css grande nem tokens (é UI-001).
- Não criar middleware.ts (Next 16 usa proxy.ts e isso é AUTH-001).
- Não editar MASTER_PLAN.md nem docs/decisions.md.

EXPECTED OUTPUT:
- Código commitado na branch indicada.
- Resumo: arquivos, versões instaladas, decisões, pendências.
- Antes de usar APIs do Next 16, consulte node_modules/next/dist/docs/.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENT A07
PAYMENTS ENGINEER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK:
PAY-001 — Spike: API AbacatePay

MODEL: Opus 5.5 (claude-opus-5-5)
EFFORT: médio

CONTEXT:
Plataforma de cursos Scorpion Bits (Next 16 + Supabase). Pagamentos via AbacatePay.
O sistema antigo usava API v1 /billing/create e tratava evento billing.paid sem
verificar assinatura (ver docs/audit.md §2.1 S6/S7). A doc de webhooks atual mostra
payloads v2 e eventos checkout.completed. Leia docs/payments.md e ADR-008.

OBJECTIVE:
Responder com fontes oficiais as 6 perguntas de docs/payments.md e atualizar o
documento com o contrato exato que PAY-002/PAY-003 vão implementar.

DEPENDENCIES: nenhuma.

FILES: docs/payments.md (apenas).

ACCEPTANCE CRITERIA:
- Endpoint/versão para criar cobrança/checkout com PIX (e cartão, se houver), payload
  e resposta de exemplo.
- Como consultar status de cobrança por id.
- Algoritmo, chave e header da assinatura do webhook, com pseudocódigo de verificação
  sobre o corpo bruto.
- Lista de eventos relevantes (pago, expirado/falho, reembolsado, disputa) e campos
  para mapear ao nosso pedido (externalId/metadata/id da cobrança, valor).
- Como testar em devMode (simular pagamento).
- Cada resposta com link da fonte; incertezas marcadas como "A CONFIRMAR".

DO NOT:
- Não escrever código de produção, não criar contas, não usar chaves reais.
- Não alterar outros arquivos.

EXPECTED OUTPUT:
- docs/payments.md atualizado + resumo das descobertas e riscos.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 9. Perguntas ao produto

| # | Pergunta | Resposta (2026-10-08) | Efeito |
|---|---|---|---|
| Q1 | Dados reais do Learn antigo a migrar? | **Não** | REL-002 cancelada (ADR-015) |
| Q2 | Supabase novo ou antigo? | **Novo** | ADR-015 |
| Q3 | TypeScript? | **Sim** | ADR-002 aceita |
| Q4 | YouTube não listado no MVP? | **Sim** | ADR-011 aceita |
| Q5 | Slides HTML interativos? | **Esquecer** | ADR-010 aceita; fora do escopo |
| Q6 | Métodos de pagamento? | **Só PIX (AbacatePay)**; estudar **Cakto** | ADR-016; estudo incluído em PAY-001 |
| Q7 | Domínio? | **Padrão Vercel** por enquanto | ADR-015 |
| Q8 | Reembolso revoga acesso? | **Sim** | ADR-017 |
| Q8b | Prazo de reembolso? | **Seguir o CDC: até 7 dias da compra**; regra de 10 min descartada | ADR-017 atualizada; PAY-003 desbloqueado |

## 10. Registro de progresso

| data | tarefa | agente | resultado | notas |
|---|---|---|---|---|
| 2026-10-08 | UI-002 | A03 (Sonnet 5.5) | DONE | 21 primitivas acessíveis em `src/components/ui` (Button com `pending`, Field com aria, Dialog/Drawer nativos com bottom-sheet mobile, Toast aria-live, Table empilhada < 720px, Tabs/DropdownMenu com teclado), alvos ≥ 44px, inputs ≥ 16px. Vitest + Testing Library configurados (12 testes). Revisão: testes/typecheck/lint verificados — aprovado. Pendências menores: sem animação de saída no Dialog, Table empilhada pode perder semântica em leitor de tela (rever em UX-002), sem testes de Table/DropdownMenu. `next dev` pode gerar `AGENTS.md` com regras do Next 16 — pode ser commitado. |
| 2026-10-08 | DB-001 + DB-002 | A02 (Opus 5.5) | DONE | 11 tabelas, enums, triggers (sync de `course_id` + FKs compostas, `published_at`, pedido imutável, matrícula só revogável e `purchase` só com pedido pago), checks por tipo de material (sem `pdf`) e antiinjeção, RLS ligada e tudo revogado de anon/authenticated (policies no DB-003). Validado em PG16 local: 109 asserções. Revisão do orquestrador: triggers e guards conferidos — aprovado. Achado: exclusão de conta de comprador bloqueada (→ DB-008). Docker indisponível no ambiente (R3). |
| 2026-10-08 | UI-001 | A03 (Sonnet 5.5) | DONE | Assets em `public/brand`, Grotesk/Inter via `next/font/local`, `tokens.css` (+ tokens extras), `base.css` em `@layer base`, `IsoBackdrop` estático, modo leve, metadata/OG, home "em construção" com identidade SB. Revisado visualmente (1440/390/360) — aprovado. Zero requisições externas. Follow-ups: backdrop por route group (UI-003), ícones quadrados/manifest (UI-006), estilo de link e spinner sem rotação (UI-002), CSP com nonce p/ script inline (QA-002). |
| 2026-10-08 | PAY-001 | A07 (Opus 5.5) | DONE | API v2; **Checkout Transparente PIX** (ADR-018); HMAC do webhook usa chave pública → reconsulta obrigatória; sem evento de expiração; reembolso via API. Cakto: manter AbacatePay no MVP (PIX R$0,80 vs ~R$3,48; Cakto exige oferta cadastrada e tem área de membros concorrente); reavaliar com cartão/afiliados. Orquestrador: env HMAC removida, fluxo de compra e `orders` atualizados (DB-002 avisado), criadas PAY-006 e STUDENT-008. Pendências A CONFIRMAR em `docs/payments.md` §Pendências. |
| 2026-10-08 | ARCH-002 | A01 (Sonnet 5.5) | DONE | `supabase init` (config.toml; senha mínima ajustada para 8 pelo orquestrador), clients `src/lib/supabase/{browser,server,service}.ts` tipados com `Database`; `createServiceClient()` é `server-only`. Env de servidor dividido em `getSupabaseServerEnv()` / `getPaymentsEnv()`. Scripts `db:*`. Pendente: Docker/`supabase start` não testado no ambiente dos agentes (R3); redirect URLs de auth em AUTH-001. |
| 2026-10-08 | ARCH-003 | A01 (Haiku 5.5) | DONE | `.github/workflows/ci.yml`: format, lint, typecheck, test (if present), build com env dummy; concurrency e permissions mínimas. Execução real será validada no primeiro PR. |
| 2026-10-08 | ARCH-001 | A01 (Sonnet 5.5) | DONE | Next 16.4.0, React 19.3, TS 6.0 strict, zod 4. Env lazy em `src/lib/env/{client,server,shared}.ts`; `@/lib/env` só reexporta o cliente (secrets exigem import explícito de `@/lib/env/server`). `.prettierignore` protege docs. Revisão: build/lint/typecheck verificados pelo orquestrador. Achados: (1) server env exige todas as chaves → dividir por domínio em ARCH-002; (2) `npm audit` alto em `braces` via eslint-config-next (só dev tooling) — aceito, reavaliar em upgrades; (3) prettier do agente reverteu docs momentaneamente — incidente sem perda. |
| 2026-10-08 | Respostas do produto Q1–Q8 | Orquestrador | registrado | ADR-002/010/011 aceitas; ADR-015/016/017 criadas; REL-002 cancelada. Onda 1 delegada. |
| 2026-10-08 | PHASE 0 — Auditoria e plano | Orquestrador (Opus 5.5) | DONE | `docs/audit.md`, `docs/*`, `CLAUDE.md`, este plano. 9 falhas de segurança catalogadas no sistema antigo (S1–S9), todas endereçadas por ADRs 005–010. |

## 11. Problemas conhecidos / riscos
- **R1** API AbacatePay em transição v1→v2 — mitigado por PAY-001 antes de qualquer código.
- **R2** Next 16 tem breaking changes vs. conhecimento dos modelos — agentes devem ler `node_modules/next/dist/docs/`.
- **R3** Supabase local exige Docker; ambientes de agentes na nuvem podem não ter — usar projeto Supabase de dev remoto e/ou rodar pgTAP no CI.
- **R4** Vídeos em YouTube não listado podem vazar (ADR-011).
