# ADMIN-001 — Dashboard do admin

**Agente:** A05 Admin · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
Substituir o placeholder de `/admin` por um dashboard real e com a linguagem isométrica da marca (não um template genérico).

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `ADMIN-001`
- `docs/database.md` §4 → parágrafo "Métricas (DB-006)" (semântica dos números, parâmetros, erros)
- `docs/design-system.md` §7 → "Dashboard admin"
- `src/app/admin/page.tsx` (placeholder atual) e `src/features/courses/queries.ts` (padrão de query)
- Componentes: `src/components/ui/index.ts`, `src/components/brand/index.ts` (`IsoCube`, `ChamferCard`)

## Entregas
- `src/features/admin-metrics/{queries,schemas,model}.ts` (+ testes): períodos 7/30/90 dias via `?periodo=7|30|90` (padrão 30), `p_from`/`p_to` no fuso de São Paulo com `p_to` exclusivo; mapeamento de bigint → number.
- `/admin`:
  - Seletor de período (links/chips, funciona sem JS).
  - 4 KPIs principais: receita líquida, vendas, alunos novos, matrículas (compra + atribuição), cada um com `IsoCube`/chanfro e comparativo opcional não necessário. Linha secundária: ticket médio, reembolsos, pedidos de reembolso pendentes (link para `/admin/pedidos?filtro=reembolso`, rota futura).
  - Gráfico de receita por dia em **SVG próprio** (barras com cores da marca, eixo simples, valores negativos abaixo da linha zero, tabela acessível alternativa `<table>` visualmente oculta com `.visually-hidden`). Sem lib de gráfico.
  - Top 5 cursos (tabela → cartões no mobile).
  - Cada bloco em `<Suspense>` com skeleton próprio (streaming); erro por bloco com `ErrorState`.
- Remover dados fictícios do placeholder.

## Critérios de aceite
- Leitura só via RPC com o client do usuário (RLS + `is_admin`); `requireAdmin` já está no layout, mas a página também deve tratar `42501` com `notFound()`.
- 360px por toque; teclado; leitor de tela (gráfico tem alternativa em tabela).
- Testes: cálculo do intervalo (fuso, `p_to` exclusivo), mapeamento, escala do gráfico com negativos.
- `lint`, `typecheck`, `test`, `build` passam sem env.
- Screenshots com dados mockados (página `/dev/admin-dashboard`, 404 em produção) em 390 e 1440 em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/admin-001/`.

## Não fazer
- Não editar migrations, `src/lib/*`, `src/types/database.ts`, `src/features/` de outros domínios, `src/app/(student)|(public)|(auth)/`, `src/components/ui|brand|layout`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · screenshots · pendências.
