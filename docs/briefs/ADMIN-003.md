# ADMIN-003 — Editor de ementa (módulos e aulas)

**Agente:** A05 Admin · **Modelo:** Sonnet 5.5 · **Esforço:** alto

## Objetivo
Aba "Ementa" em `/admin/cursos/[id]`: criar, renomear, excluir e reordenar módulos e aulas; marcar aula como prévia; duração.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `ADMIN-003`
- `docs/database.md` → tabelas `course_modules`, `lessons` e funções `reorder_*` (grep)
- `src/features/courses/{queries,actions,schemas}.ts` (padrão a seguir) e `src/app/admin/cursos/[id]/page.tsx` (onde a aba entra)
- `src/lib/auth/actions.ts` (assinatura de `adminAction`)
- Componentes: `src/components/ui/index.ts`

## Entregas
- `src/features/curriculum/{queries,actions,schemas}.ts` (+ testes).
- Aba Ementa habilitada: lista de módulos (acordeão) com suas aulas; adicionar/renomear inline; excluir com confirmação (`Dialog`) mostrando o que será apagado; reordenar com botões ↑/↓ acessíveis (drag nativo opcional, nunca o único meio); toggle de prévia; duração em minutos (salvar segundos).
- Reordenação via `rpc('reorder_modules' | 'reorder_lessons')` (atômica); `useOptimistic` com rollback e toast de erro.
- Link "Materiais" por aula apontando para `/admin/cursos/[id]/aulas/[lessonId]` (página fica para ADMIN-004 — só o link).

## Critérios de aceite
- Toda mutação via `adminAction` + zod; IDs validados como uuid.
- Funciona por toque em 360px e só com teclado.
- Estados vazio (curso sem módulos), loading, erro.
- Testes das actions (Supabase mockado): não-admin rejeitado, reorder chama a RPC com a ordem certa, exclusão.
- `lint`, `typecheck`, `test`, `build` passam sem env.

## Não fazer
- Não editar migrations, `src/lib/*`, `src/features/auth/`, `src/app/(auth)/`, `src/app/(public)/`, `src/components/ui|brand`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Materiais (ADMIN-004). Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · pendências.
