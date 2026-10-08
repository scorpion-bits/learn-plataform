# STUDENT-007 + STUDENT-004 — Progresso e biblioteca do aluno

**Agente:** A06 Student Experience · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
Aluno conclui aulas (com resposta imediata), vê o progresso do curso, e tem um início/biblioteca que mostra o que continuar.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seções `STUDENT-007` e `STUDENT-004`
- `docs/database.md` → `lesson_progress` (colunas e GRANT de INSERT/UPDATE) e view `my_library` (grep)
- `src/features/player/actions.ts` (`registerLessonVisit`: padrão do upsert — `course_id` NÃO vai no payload) e `src/features/player/components/PlayerView.tsx` (slot `complete` a substituir)
- `src/app/(student)/(app)/inicio/page.tsx` (placeholder a substituir) e `src/components/layout/StudentShell*` (links da tab bar)
- Componentes: `src/components/ui/index.ts`, `src/components/brand/index.ts` (`CubeProgress`, `IsoCover`, `ChamferCard`)

## Entregas
**STUDENT-007**
- Action `setLessonCompleted(lessonId, completed: boolean)` (`userAction`): upsert em `lesson_progress` com `completed_at = now()` ou `null`.
- Botão "Concluir aula" / "Concluída ✓ (desfazer)" no player com `useOptimistic` + rollback e toast de erro; ao concluir, oferecer "Ir para a próxima" (não navegar sozinho). `CubeProgress` e ementa atualizados (otimista + `router.refresh()`).
- Ao concluir a última aula pendente: estado "Curso concluído" com celebração isométrica discreta (cubos acendendo; desligada em reduced-motion/`[data-lite]`).
**STUDENT-004**
- `src/features/library/queries.ts` (via `my_library`).
- `/inicio`: "Continuar de onde parou" (curso com acesso mais recente, card grande com capa, próxima aula e `CubeProgress`), atalhos para biblioteca/catálogo; estado vazio para quem não tem cursos (CTA catálogo).
- `/minha-biblioteca`: abas Em andamento / Concluídos / Todos (via `?aba=`), card por curso com selo de origem (Comprado / Atribuído — se ambos, "Comprado"), progresso e link "Continuar" (`/aprender/<slug>`). Vazio/erro/loading.

## Critérios de aceite
- Concluir responde em < 100 ms visualmente (otimista), nunca finge sucesso: rollback em erro.
- 360px por toque (barra inferior do player), teclado, leitor de tela (`aria-pressed` no botão, anúncio de mudança de progresso).
- Testes: action (payload sem `course_id`, `user_id` da sessão, rejeita anônimo), cálculo de "continuar", agrupamento por aba, selo de origem.
- `lint`, `typecheck`, `test`, `build` passam sem env.
- Screenshots (vitrines `/dev/...` com mock, 404 em produção) de `/inicio`, `/minha-biblioteca` e player com aula concluída/curso concluído, 390 e 1440, em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/student-007/` (Playwright: `require('/opt/node22/lib/node_modules/playwright')`, Chromium já instalado).

## Não fazer
- Não editar migrations, `src/lib/*`, `src/components/ui|brand|layout`, `src/features/admin*|courses|curriculum|materials|catalog/`, `src/app/admin/`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · screenshots · pendências.
