# Roadmap

> Resumo das fases e ondas de execução. O backlog detalhado (tarefas, critérios, status) vive em `docs/backlog.md`.

## Fases
| fase | nome | objetivo | sai quando |
|---|---|---|---|
| 0 | AUDIT | diagnóstico + plano | docs e backlog aprovados ✅ |
| 1 | FOUNDATION | projeto Next/TS, Supabase CLI, CI, env | `build` e CI verdes em repo vazio funcional |
| 2 | DATA & SECURITY CORE | schema, RLS, storage, testes de RLS | `db:test` cobre matriz de `docs/authorization.md` |
| 3 | DESIGN SYSTEM | tokens, fontes, primitivas, componentes de marca, shells | página `/dev/ui` aprovada visualmente |
| 4 | AUTH | sessão, guards, telas de login/cadastro | aluno e admin logam; rotas protegidas em 3 camadas |
| 5 | ADMIN — CONTEÚDO | cursos, ementa, materiais | admin cria e publica um curso completo |
| 6 | STUDENT | landing, catálogo, página do curso, biblioteca, player, progresso | aluno com acesso conclui um curso |
| 7 | PAYMENTS | checkout AbacatePay, webhook, concessão | compra em sandbox libera acesso só após webhook |
| 8 | ADMIN — PESSOAS & MÉTRICAS | dashboard, alunos, atribuições, pedidos | admin atribui/revoga e vê métricas |
| 9 | UX / PERFORMANCE | estados, skeletons, prefetch, a11y, responsivo | checklist UX por tela completo; Lighthouse ≥ 90 mobile nas públicas |
| 10 | QA | segurança, e2e, regressão | revisão de segurança sem achados críticos |
| 11 | RELEASE | prod, migração de dados, lançamento | em produção |

Fases 3 e 2 correm em paralelo; `PAY-001` (pesquisa) corre desde a fase 1.

## Ondas de paralelismo

```text
Onda 1:  ARCH-001 ─────────────┐            PAY-001 (pesquisa, só docs)
                               │
Onda 2:  ARCH-002 ──┐   ARCH-003 (CI)   UI-001 (tokens/fontes/assets)
                    │
Onda 3:  DB-001 → DB-002 → DB-003 → DB-004 → DB-005      UI-002 ∥ UI-004 → UI-003
         (sequencial, mesmo agente)                       (design system)
                    │
Onda 4:  AUTH-001 → AUTH-002 → AUTH-003       DB-006 (métricas)   DB-007 (seed)
                    │
Onda 5:  ADMIN-002 → ADMIN-003 → ADMIN-004   ∥   STUDENT-001 (landing) ∥ STUDENT-002/003 (catálogo/curso)
                    │                                   │
Onda 6:  STUDENT-005 → STUDENT-006 → STUDENT-007  ∥  PAY-002 → PAY-003 → PAY-004   ∥  STUDENT-004
Onda 7:  ADMIN-001 ∥ ADMIN-005 → ADMIN-006 ∥ ADMIN-007 ∥ PAY-005
Onda 8:  UX-001..004  →  QA-002 (security review) ∥ QA-003 (e2e)  →  REL-*
```

Regra: duas tarefas só correm em paralelo se não editam os mesmos arquivos-núcleo (`supabase/migrations`, `src/lib/auth`, `src/styles/tokens.css`, `src/proxy.ts`). Migrations são sempre sequenciais e de um único agente por vez.
