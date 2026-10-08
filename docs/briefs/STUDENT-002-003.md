# STUDENT-002 + STUDENT-003 — Catálogo e página pública do curso

**Agente:** A06 Student Experience · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
`/cursos` (catálogo público com filtros) e `/cursos/[slug]` (página do curso com ementa e CTA), com a identidade isométrica e ótima experiência no celular.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seções `STUDENT-002` e `STUDENT-003`
- `docs/database.md` → views `course_catalog`, `course_outline`, `my_library` (grep)
- `docs/design-system.md` → §7 "Telas-chave" (Catálogo e Página do curso)
- `src/lib/auth/dal.ts` (assinaturas: `getCurrentUser`) e `src/features/materials/storage.ts` (`getCoverPublicUrl`)
- `src/app/(public)/layout.tsx` (onde as rotas entram)
- Componentes: `src/components/ui/index.ts`, `src/components/brand/index.ts` (`ChamferCard`, `IsoCover`, `IsoCube`, `CubeProgress`)

## Entregas
- `src/features/catalog/queries.ts` (+ testes de mapeamento).
- `/cursos`: filtros categoria e nível como chips no URL (`?categoria=&nivel=`), primeiro curso destacado em largura dupla no desktop, card com capa, nível (1–3 cubos), nº de aulas, duração, preço formatado (BRL) e selo "Na sua biblioteca" se logado com acesso (via `my_library`). Vazio e erro amigáveis.
- `/cursos/[slug]`: `IsoCover`, título, subtítulo, descrição (markdown renderizado como texto simples/parágrafos — sem lib nova), ementa em acordeão (módulos → aulas com duração e selo "Prévia"), CTA contextual: anônimo "Entrar para comprar" (`/entrar?next=/cursos/<slug>`), logado sem acesso "Comprar" (link para `/checkout/<slug>`, página futura), com acesso "Continuar curso" (`/aprender/<slug>`). CTA fixo no rodapé em telas < 720px. `generateMetadata` com OG da capa. `notFound()` para slug inexistente/não publicado.
- `loading.tsx` com skeletons de mesma geometria e `error.tsx` nas duas rotas.

## Critérios de aceite
- Só dados permitidos pela RLS para anônimo (usa as views; nada de service client).
- 360px por toque, teclado, leitor de tela (cards com link único, headings corretos).
- `lint`, `typecheck`, `test`, `build` passam sem env.
- Screenshots de `/cursos` e `/cursos/[slug]` em 390 e 1440 com dados mockados (pode usar uma página `/dev/` temporária com dados fake se não houver banco) em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/student-002/`.

## Não fazer
- Não editar `src/lib/*`, `src/features/auth|courses|curriculum/`, `src/app/admin/`, `src/app/(auth)/`, `src/components/ui|brand` (peça no relatório), migrations, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · screenshots · pendências.
