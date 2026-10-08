# Backlog detalhado

> Gerado a partir do antigo MASTER_PLAN.md. Leia só a seção que sua tarefa precisa.

**O status oficial é o do índice em `MASTER_PLAN.md`** (os campos Status abaixo podem estar desatualizados). Este arquivo guarda descrição e critérios.

## Tarefas

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
- **Status**: DONE ✅ · **Agente**: A02 · **Modelo**: Opus 5.5 · **Esforço**: alto

#### DB-004 — Storage buckets e policies
- **Descrição**: buckets `course-covers` (público, 5 MB, imagens) e `course-content` (privado, 200 MB, zip/imagens/áudio/arquivos de projeto), policies admin-only de escrita; helper server-side `getSignedMaterialUrl(materialId)` que checa acesso.
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-003
- **Arquivos**: `supabase/migrations/20261008000004_storage.sql`, `src/features/materials/storage.ts`
- **Critérios**: student não lista nem baixa `course-content` direto; signed URL ≤ 10 min; respostas com `private, no-store`.
- **Status**: IN PROGRESS · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### DB-005 — Testes de RLS (pgTAP)
- **Descrição**: suíte em `supabase/tests/` cobrindo anon / student sem acesso / student com acesso / student com acesso revogado / admin para cada tabela, bucket e função; inclui tentativas de ataque (auto-promoção, inserir enrollment, ler materiais pagos, alterar pedido, chamar `fulfill_order`).
- **Prioridade**: P0 · **Fase**: 2 · **Dependências**: DB-003, DB-004
- **Critérios**: `npm run db:test` verde; cada linha da matriz tem ao menos 1 teste; ataques S1/S2/S8 do audit falham.
- **Status**: IN PROGRESS · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### DB-006 — Métricas do admin
- **Descrição**: `admin_dashboard_metrics(from, to)` (receita, nº vendas, ticket médio, alunos totais/novos, matrículas por origem, top 5 cursos) + `admin_revenue_by_day(from,to)` + view `admin_students`; todas checam `is_admin()`.
- **Prioridade**: P1 · **Fase**: 8 · **Dependências**: DB-005
- **Critérios**: student recebe erro/zero linhas; testes pgTAP; consultas < 200 ms com 10k pedidos (índices).
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### DB-008 — Exclusão de conta e anonimização (LGPD)
- **Descrição**: `orders` usa `on delete restrict` para o comprador (registro financeiro), então excluir a conta de quem comprou é bloqueado. Definir processo: anonimizar `profiles` (nome/CPF/telefone), desativar login no Auth, manter `orders` com referência pseudonimizada. Mesmo para admins com histórico de concessões.
- **Prioridade**: P2 · **Fase**: 10 · **Dependências**: DB-005 · **Requer humano**: validação jurídica
- **Status**: BACKLOG · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### DB-009 — Função `admin_student_by_id`
- **Descrição**: o perfil do aluno no admin (ADMIN-006) não tem como ler o email por id; hoje busca por nome em `admin_students`. Criar `admin_student_by_id(p_user_id)` admin-only (mesmo padrão de `admin_students`) + pgTAP + tipo em `database.ts`, e trocar a query em `src/features/students/queries.ts`.
- **Prioridade**: P1 · **Dependências**: ADMIN-006
- **Status**: IN PROGRESS · **Agente**: A02 · **Modelo**: Sonnet 5.5 · **Esforço**: baixo

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
- **Status**: DONE ✅ · **Agente**: A03 · **Modelo**: Sonnet 5.5 · **Esforço**: alto

#### UI-003 — Shells de layout
- **Descrição**: `PublicShell` (Dock + footer), `StudentShell` (Dock com menu do usuário), `PlayerShell` (topo/ementa/drawer), `AdminShell` (sidebar colapsável/drawer + breadcrumbs).
- **Prioridade**: P0 · **Fase**: 3 · **Dependências**: UI-002, UI-004
- **Critérios**: mover `IsoBackdrop` do root layout para os layouts dos route groups (`full` em público/aluno, `subtle` no admin); landmarks corretos; skip-link; menus acessíveis; funcionam em 360/768/1024/1440.
- **Status**: DONE ✅ · **Agente**: A03 · **Modelo**: Sonnet 5.5 · **Esforço**: médio

#### UI-006 — Ícones de app e manifest
- **Descrição**: PWA instalável (ADR-019): ícones quadrados 180/192/512 + maskable a partir do glyph, `manifest.webmanifest` (`display: standalone`, `start_url: /inicio`, cores da marca), apple-touch-icon, `viewport-fit=cover` + safe-area. Sem service worker offline no MVP.
- **Prioridade**: P1 · **Fase**: 3 · **Dependências**: UI-001
- **Status**: DONE ✅ · **Agente**: A03 · **Modelo**: Haiku 5.5 · **Esforço**: baixo

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
- **Critérios**: remover `src/components/layout/dev-user.ts` e os `TODO(AUTH-002)` dos layouts, passando o usuário real aos shells; `requireAdmin` usa `user_roles` (banco), nunca metadata/cookie; testes unitários com mocks; documentação em `docs/authentication.md` atualizada.
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
