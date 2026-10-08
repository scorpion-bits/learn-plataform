# ADMIN-002 — Cursos: lista, criação, edição e publicação

**Agente:** A05 Admin · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
Admin lista cursos, cria, edita informações (com capa) e publica/despublica, tudo no celular e no desktop.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `ADMIN-002`
- `docs/database.md` → tabela `courses` e `categories` (grep), e §6 (storage `course-covers`)
- `src/lib/auth/actions.ts` (`adminAction`) e `src/lib/auth/dal.ts` (assinaturas)
- `src/features/materials/storage.ts` (`getCoverPublicUrl`)
- `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` (padrão de página admin)
- Componentes: `src/components/ui/index.ts`, `src/components/brand/index.ts` (`IsoCover`, `ChamferCard`)

## Entregas
- `src/features/courses/{queries,actions,schemas}.ts`.
- `/admin/cursos` (tabela: título, status, preço, nº de aulas, alunos; vira lista no mobile; vazio com CTA), `/admin/cursos/novo`, `/admin/cursos/[id]` (aba Informações; abas Ementa/Alunos como placeholders desabilitados para ADMIN-003/008).
- Campos: título, slug (gerado do título, editável, validado pelo formato do banco), subtítulo, descrição (markdown simples, textarea), categoria, nível, preço em R$ (converter para centavos no servidor), capa (upload para `course-covers` pelo client do admin com preview e progresso; caminho `courses/<courseId>/<uuid>.<ext>`; tipos/limite do bucket).
- Publicar/despublicar/arquivar: Server Action com validação (preço > 0, capa, ≥ 1 aula) e mensagens claras do que falta; `useOptimistic` no status com rollback.
- `next.config.ts`: `images.remotePatterns` para o host do Supabase Storage (derive de `NEXT_PUBLIC_SUPABASE_URL` sem quebrar build sem env).
- `loading.tsx` com skeleton e `error.tsx` nas rotas novas.

## Critérios de aceite
- Toda mutação via `adminAction` + zod; slug duplicado → erro no campo.
- Estados loading/empty/error/success; 360px com toque; teclado.
- Testes Vitest de schemas e actions (Supabase mockado), incluindo não-admin rejeitado.
- `typecheck`, `lint`, `test`, `build` passam sem env.

## Não fazer
- Não editar `src/lib/auth/*`, `src/proxy.ts`, `supabase/`, `src/features/auth/`, `src/app/(auth)/`, `src/components/ui|brand` (peça no relatório se precisar), `MASTER_PLAN.md`, `docs/changelog.md`.
- Ementa/materiais (ADMIN-003/004). Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · pendências.

## Retomada (2026-10-09)
O agente anterior parou por limite de uso no início. Pode existir trabalho parcial em `src/features/courses/` (não revisado) — revise ou refaça; nada mais foi criado.
