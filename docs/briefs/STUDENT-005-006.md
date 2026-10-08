# STUDENT-005 + STUDENT-006 — Player de aulas e renderizadores de materiais

**Agente:** A06 Student Experience · **Modelo:** Sonnet 5.5 · **Esforço:** alto

## Objetivo
A experiência central do produto: o aluno abre um curso, cai na aula certa, navega pela ementa e consome os materiais (vídeo, texto, arquivo, link) — excelente no celular.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seções `STUDENT-005` e `STUDENT-006`
- `docs/database.md` → `lessons`, `lesson_materials`, `lesson_progress`, views `course_outline`/`my_library`, função `has_course_access` (grep)
- `src/components/layout/PlayerShell*` (props/slots) e `src/app/dev/shells/player/page.tsx` (exemplo de uso)
- `src/lib/auth/dal.ts` (assinaturas), `src/features/materials/storage.ts` (`getMaterialDownloadUrl`), `src/features/materials/markdown.ts` (parser reutilizável)
- `src/features/catalog/queries.ts` (só `getPublishedCourse`, para reaproveitar)
- Componentes: `src/components/ui/index.ts`, `src/components/brand/index.ts`

## Entregas
- `src/features/player/{queries,schemas}.ts` (+ testes).
- `src/app/(student)/aprender/[courseSlug]/page.tsx`: redireciona para a aula de retomada (última com `updated_at` em `lesson_progress`; senão a primeira não concluída; senão a primeira).
- `src/app/(student)/aprender/[courseSlug]/[lessonId]/page.tsx` com `PlayerShell`: ementa com estados (atual / concluída / bloqueada para aulas sem acesso em curso não comprado — só prévias abrem), anterior/próxima, `<Link prefetch>` da próxima aula, atalhos de teclado (`[` `]` ou setas com modificador; documentar), `loading.tsx` com skeleton, `error.tsx`, `not-found`.
- Acesso: aula acessível se `has_course_access` **ou** `is_preview` de curso publicado (a RLS já filtra os materiais; a página deve tratar "sem acesso" com CTA para `/cursos/<slug>`). Não exige `requireUser` para aulas de prévia? **Exige**: `/aprender` é rota protegida (proxy) — visitante faz login antes.
- Ao abrir a aula: registrar retomada (upsert em `lesson_progress` só com `updated_at`, sem completar) via Server Action `userAction`, sem bloquear a renderização.
- Renderizadores `src/features/player/components/materials/`: `VideoMaterial` (lite embed: thumbnail + botão play → iframe `youtube-nocookie.com/embed/<id>` ou `player.vimeo.com/video/<id>`, `allow` mínimo, `title` acessível), `TextMaterial` (reusar o parser de `materials/markdown.ts`, sem HTML cru), `FileMaterial` (botão "Baixar" que chama Server Action que retorna a signed URL de `getMaterialDownloadUrl` e navega; nome/tamanho visíveis), `LinkMaterial` (card externo `rel="noopener noreferrer" target="_blank"`).
- Resposta das páginas do player com dados pessoais: `export const dynamic`/headers adequados para não cachear (`Cache-Control: private, no-store` quando aplicável).

## Critérios de aceite
- 360px: ementa em Drawer, barra inferior Anterior/Concluir/Próxima (o botão Concluir fica **desabilitado com texto "Em breve"** — STUDENT-007 implementa), safe-area.
- Teclado e leitor de tela: landmarks, `aria-current` na aula atual, foco no título da aula ao navegar.
- Testes: cálculo da aula de retomada; resolução anterior/próxima; parse/montagem das URLs de embed; action de download rejeita material sem acesso (mock).
- `lint`, `typecheck`, `test`, `build` passam sem env.
- Screenshots (dados mockados via página `/dev/player` com `notFound()` em produção) em 390 e 1440, incluindo Drawer aberto, em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/student-005/`.

## Não fazer
- Não implementar "Concluir aula" nem % de progresso (STUDENT-007), biblioteca (STUDENT-004).
- Não editar migrations, `src/lib/*`, `src/features/auth|courses|curriculum|catalog/` (pode importar), `src/features/materials/` (pode importar), `src/app/admin/`, `src/components/ui|brand|layout` (peça no relatório), `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · screenshots · pendências para STUDENT-007.
