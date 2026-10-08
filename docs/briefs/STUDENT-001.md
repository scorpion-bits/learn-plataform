# STUDENT-001 — Landing page

**Agente:** A06 Student Experience · **Modelo:** Sonnet 5.5 · **Esforço:** alto

## Objetivo
Substituir a página "em construção" (`/`) pela landing real: "aprenda a criar jogos com quem faz jogos", com a identidade isométrica da Scorpion Bits — deve parecer de um estúdio de jogos, não um template.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `STUDENT-001`
- `docs/design-system.md` → §1 (princípios) e §7 "Landing"
- `src/app/(public)/page.tsx` e `page.module.css` (atual)
- `src/features/catalog/queries.ts` (`getCatalog`) e `src/features/catalog/components/CourseCard*` (reaproveitar o card)
- Componentes: `src/components/brand/index.ts`, `src/components/ui/index.ts`
- Referência visual opcional: `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/refs/sb-site/index.html` (hero e seção do curso/GameLab) — só para inspiração, não copiar.

## Entregas
- Hero: título forte, subtítulo, CTAs "Ver cursos" e "Criar conta" (ou "Minha biblioteca" se logado), escorpião (`/brand/logo-poster.png` com `next/image priority`) e cubos isométricos (`IsoCube`) como composição — sem vídeo pesado.
- "Como funciona" em 3 passos (escolha → aprenda no seu ritmo, no celular também → publique seu jogo), com cubos.
- Cursos em destaque (até 3 publicados, reais via `getCatalog`; se vazio, a seção some).
- Sobre o estúdio / GameLab (texto curto, sem fotos pesadas; pode usar `public/brand` existentes).
- CTA final.
- Metadata/OG da home.

## Critérios de aceite
- Lighthouse mobile ≥ 90 em performance e acessibilidade (meça com Chromium/Playwright ou `npx lighthouse` se disponível; senão, justificar: sem JS desnecessário, imagens otimizadas, LCP = imagem do hero com `priority`).
- Sem overflow em 360px; reduced-motion e `[data-lite]` respeitados; headings em ordem.
- `lint`, `typecheck`, `test`, `build` passam sem env (a seção de cursos deve tolerar Supabase indisponível → some).
- Screenshots 390 e 1440 (com cursos mockados via vitrine `/dev/landing`, 404 em produção) em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/student-001/` (Playwright: `require('/opt/node22/lib/node_modules/playwright')`).

## Não fazer
- Não editar `src/components/*`, `src/lib/*`, `src/features/` (exceto importar), `src/app/(public)/cursos|termos|privacidade`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · métricas de performance · screenshots · pendências.
