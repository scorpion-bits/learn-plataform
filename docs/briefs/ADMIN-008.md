# ADMIN-008 — Aba "Alunos" no curso (admin)

**Agente:** A05 — Admin · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
Em `/admin/cursos/[id]`, a aba "Alunos (em breve)" vira "Alunos": lista de matriculados com nome, email, origem (compra/atribuição), data, status (ativa/revogada) e % de progresso; busca por nome/email; link para o perfil do aluno (`/admin/alunos/[id]`).

## Leia (somente isto)
- `CLAUDE.md`; `docs/backlog.md` → `ADMIN-008`; `docs/authorization.md` (admin lê enrollments/lesson_progress/profiles)
- A aba atual: grep `'Alunos (em breve)'` em `src/features/courses/components/`
- Padrões a copiar: `src/features/students/queries.ts` (emails via RPC `admin_student_by_id`/`admin_students`), `src/features/students/components/*` (tabela + cards mobile), `src/features/orders/components/OrdersList.tsx`
- Como o progresso é calculado: grep `progress` em `src/features/students/queries.ts` e `supabase/migrations/*metrics*`

## Entregas
- `src/features/courses/queries.ts` (ou `src/features/course-students/`): `listCourseStudents(courseId, { q, page })` com o client do usuário (RLS admin). Se o cálculo de progresso por aluno ficar N+1 ou pesado, crie RPC admin-only em migration `20261009000010_course_students.sql` + `supabase/tests/12_course_students.test.sql` (anon/aluno negados, admin ok), padrão `security definer` + `search_path=''` + checagem `is_admin()`. Atualize `src/types/database.ts`.
- Componente da aba com estados loading/empty/error, tabela no desktop e cards no celular (360px), paginação de 20.
- Testes Vitest da query/mapeamento.

## Não fazer
- Não alterar outras abas, actions de curso, nem `src/features/students` além de reaproveitar. Não editar `MASTER_PLAN.md`/`docs/changelog.md`. Não commitar.
- Migration só com prefixo `…000010_` (o `…000009_` é do DB-008).

## Pronto quando
`npm run lint && npm run typecheck && npm test && npm run build` (+ pgTAP se criou migration, num DB próprio `admin008` criado como em `docs/briefs/DB-008.md`). Screenshots 360 e 1440 (vitrine `/dev/...` com dados falsos) em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/admin-008/`.
