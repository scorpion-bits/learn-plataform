# MASTER PLAN — índice

> **Índice, não documentação.** Para executar uma tarefa, leia o brief dela em `docs/briefs/<ID>.md` (quando existir) e apenas os arquivos que ele aponta. Detalhes de cada tarefa: `docs/backlog.md`.
> Última atualização: 2026-10-09.

## 0. Status rápido

| item | estado |
|---|---|
| Fase atual | PHASE 7 (pagamentos) — compra, pedidos e reembolso prontos; falta teste PIX real (QA-004) |
| Em andamento | — (aguardando QA-004 com o produto) |
| Próximas | `QA-004` (teste PIX real com o produto) · `UX-001..004` · `QA-001..003` · `ADMIN-008` |
| Bloqueios | — |
| Pendências do produto | aprovação visual dos componentes isométricos e shells |

---

## 1. Onde está cada coisa

| Preciso de… | Arquivo |
|---|---|
| Visão, escopo, respostas do produto, riscos | `docs/product.md` |
| Descrição/critérios de uma tarefa | `docs/backlog.md` (busque pelo ID) |
| Brief pronto para um agente | `docs/briefs/<ID>.md` |
| Agentes, modelos, processo de revisão | `docs/agents.md` |
| Histórico do que foi feito | `docs/changelog.md` |
| Arquitetura / banco / auth / pagamentos / design | `docs/architecture.md`, `docs/database.md`, `docs/authentication.md`, `docs/authorization.md`, `docs/payments.md`, `docs/design-system.md` |
| Decisões (ADRs) | `docs/decisions.md` |
| Fases e ondas | `docs/roadmap.md` |
| Fora do MVP | `docs/post-mvp.md` |
| **Colocar no ar (Supabase/Vercel/AbacatePay)** | `docs/setup.md` |

## 2. Tarefas

| ID | Tarefa | Prior. | Status | Agente | Modelo |
|---|---|---|---|---|---|
| ARCH-001 | Scaffold do projeto Next.js 16 + TypeScript | P0 | DONE ✅ | A01 | Sonnet 5.5 |
| ARCH-002 | Supabase CLI, clients e tipos | P0 | DONE ✅ | A01 | Sonnet 5.5 |
| ARCH-003 | CI (GitHub Actions) | P1 | DONE ✅ | A01 | Haiku 5.5 |
| ARCH-004 | Vercel + ambientes | P1 | BACKLOG | A01 | Haiku 5.5 |
| DB-001 | Schema de conteúdo e identidade | P0 | DONE ✅ | A02 | Opus 5.5 |
| DB-002 | Schema de acesso, comércio e progresso | P0 | DONE ✅ | A02 | Opus 5.5 |
| DB-003 | RLS, funções de segurança e trigger de cadastro | P0 | DONE ✅ | A02 | Opus 5.5 |
| DB-004 | Storage buckets e policies | P0 | DONE ✅ | A02 | Sonnet 5.5 |
| DB-005 | Testes de RLS (pgTAP) | P0 | DONE ✅ | A02 | Sonnet 5.5 |
| DB-006 | Métricas do admin | P1 | DONE ✅ | A02 | Sonnet 5.5 |
| DB-007 | Seed de desenvolvimento | P2 | DONE ✅ | A02 | Haiku 5.5 |
| DB-008 | Exclusão de conta e anonimização (LGPD) | P2 | BACKLOG | A02 | Sonnet 5.5 |
| DB-009 | Função `admin_student_by_id` (email no perfil do aluno) | P1 | DONE ✅ | A02 | Sonnet 5.5 |
| UI-001 | Tokens, fontes, base e assets de marca | P0 | DONE ✅ | A03 | Sonnet 5.5 |
| UI-002 | Primitivas de UI | P0 | DONE ✅ | A03 | Sonnet 5.5 |
| UI-003 | Shells de layout | P0 | DONE ✅ | A03 | Sonnet 5.5 |
| UI-004 | Componentes de assinatura isométricos | P1 | DONE ✅ | A03 | Sonnet 5.5 |
| UI-005 | Vitrine `/dev/ui` | P2 | BACKLOG | A03 | Haiku 5.5 |
| UI-006 | Ícones de app e manifest | P1 | DONE ✅ | A03 | Haiku 5.5 |
| AUTH-001 | Proxy e sessão | P0 | DONE ✅ | A04 | Sonnet 5.5 |
| AUTH-002 | DAL e guards | P0 | DONE ✅ | A04 | Sonnet 5.5 |
| AUTH-003 | Telas de autenticação | P0 | DONE ✅ | A04 | Sonnet 5.5 |
| AUTH-004 | Página "Minha conta" | P1 | DONE ✅ | A04 | Sonnet 5.5 |
| ADMIN-001 | Dashboard | P1 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-002 | Cursos: lista, criação, edição, publicação | P0 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-003 | Editor de ementa (módulos e aulas) | P0 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-004 | Editor de materiais da aula | P0 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-005 | Alunos: lista e busca | P1 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-006 | Perfil do aluno e atribuições | P0 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-007 | Pedidos | P1 | DONE ✅ | A05 | Sonnet 5.5 |
| ADMIN-008 | Alunos do curso | P2 | BACKLOG | A05 | Haiku 5.5 |
| STUDENT-001 | Landing page | P1 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-002 | Catálogo público | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-003 | Página pública do curso | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-004 | Início e biblioteca do aluno | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-005 | Player: estrutura e navegação | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-006 | Renderizadores de materiais | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-007 | Progresso | P0 | DONE ✅ | A06 | Sonnet 5.5 |
| STUDENT-008 | Páginas legais e rodapé institucional | P0 | DONE ✅ | A06 | Haiku 5.5 |
| PAY-001 | Spike: API AbacatePay | P0 | DONE ✅ | A07 | Opus 5.5 |
| PAY-002 | Cliente AbacatePay + `startCheckout` | P0 | DONE ✅ | A07 | Opus 5.5 |
| PAY-003 | Webhook e concessão | P0 | DONE ✅ | A07 | Opus 5.5 |
| PAY-004 | Página de status do pedido | P0 | DONE ✅ | A07 | Sonnet 5.5 |
| PAY-005 | Reconciliação e expiração | P2 | DONE ✅ | A07 | Sonnet 5.5 |
| PAY-006 | Solicitação e execução de reembolso | P1 | DONE ✅ | A07 | Sonnet 5.5 |
| UX-001 | `loading.tsx`/skeletons por segmento, `error.tsx`, `not-found.tsx`, prefetch e transições | P1 | BACKLOG | A06/A08 | Sonnet 5.5 |
| UX-002 | Auditoria de acessibilidade (axe + teclado + leitor de tela) e correções | P1 | BACKLOG | A06/A08 | Sonnet 5.5 |
| UX-003 | Passe responsivo 360/390/768/1024/1440 em todas as telas | P1 | BACKLOG | A06/A08 | Sonnet 5.5 |
| UX-004 | Performance: imagens (`next/image`), bundle analyzer, cache de leituras públicas | P2 | BACKLOG | A06/A08 | Haiku 5.5 |
| QA-001 | Setup Playwright + integração no CI (Vitest já configurado no UI-002) | P1 | BACKLOG | A06/A08 | Sonnet 5.5 |
| QA-002 | Revisão de segurança adversarial (actions, rotas, RLS, storage, headers, secrets) | P0 | DONE ✅ | A06/A08 | **Opus 5.5** |
| QA-003 | E2E dos fluxos críticos (cadastro→compra mock→acesso→progresso; admin cria curso; admin atribui/revoga) — rodando também em perfis de celular (Pixel/iPhone) | P0 | BACKLOG | A06/A08 | Sonnet 5.5 |
| QA-004 | Teste de pagamento real em devMode/sandbox (roteiro manual + evidências) | P0 | BACKLOG | A06/A08 | Sonnet 5.5 + humano |
| REL-001 | Setup de produção (Supabase prod, migrations, admin bootstrap, envs Vercel, webhook URL, domínio) | P0 | BACKLOG | A01 | Haiku 5.5 + **humano** |
| REL-002 | Migração de dados do Learn antigo | — | CANCELADA (Q1) | A01 | — |
| REL-003 | Checklist de lançamento (inclui revisão jurídica de termos/privacidade) e desativação do app antigo | P1 | BACKLOG | A01 | Haiku 5.5 |
