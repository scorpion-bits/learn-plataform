# Agentes e processo de orquestração

> Gerado a partir do antigo MASTER_PLAN.md. Leia só a seção que sua tarefa precisa.

## 1. Agentes

Regra de custo: Opus só onde um erro custa dinheiro/segurança ou afeta todo o sistema; Sonnet para features; Haiku para tarefas mecânicas. O orquestrador (este papel) revisa tudo; revisões de segurança usam Opus.

```text
AGENT A01 — FOUNDATION ENGINEER
Responsabilidade: scaffold, Supabase CLI/clients, CI, Vercel/headers.
Tarefas: ARCH-001, ARCH-002, ARCH-003, ARCH-004
Dependências: PHASE 0
Modelo: Sonnet 5.5 (ARCH-003/004: Haiku 5.5)
Esforço: médio (CI/Vercel: baixo)
Justificativa: configuração conhecida, mas define padrões que todos herdam — vale Sonnet com atenção.

AGENT A02 — DATABASE & SECURITY ENGINEER
Responsabilidade: schema, migrations, RLS, funções, storage, testes pgTAP, métricas SQL, seed.
Tarefas: DB-001..DB-007
Dependências: ARCH-002
Modelo: Opus 5.5 (DB-001..003) · Sonnet 5.5 (DB-004..006) · Haiku 5.5 (DB-007)
Esforço: alto (DB-007: baixo)
Justificativa: o banco é a fronteira de segurança real; os bugs do sistema antigo eram todos aqui.

AGENT A03 — DESIGN SYSTEM ENGINEER
Responsabilidade: identidade SB, tokens, fontes, primitivas, componentes isométricos, shells, a11y.
Tarefas: UI-001..UI-005, UX-002
Dependências: ARCH-001
Modelo: Sonnet 5.5 (UI-005: Haiku 5.5)
Esforço: alto em UI-001/UI-004 (qualidade visual é requisito central), médio no resto.
Justificativa: trabalho visual/criativo isolado do backend; Sonnet entrega bem com direção detalhada.

AGENT A04 — AUTHENTICATION ENGINEER
Responsabilidade: proxy, DAL/guards, telas de auth, conta.
Tarefas: AUTH-001..AUTH-004
Dependências: ARCH-002, DB-003, UI-003 (para telas)
Modelo: Sonnet 5.5 (AUTH-004: Haiku 5.5)
Esforço: alto em AUTH-001/002, médio em AUTH-003.
Justificativa: padrões bem documentados do Supabase SSR; a segurança dura está no banco (A02) e será revisada por A08.

AGENT A05 — ADMIN ENGINEER
Responsabilidade: painel admin (conteúdo, alunos, pedidos, dashboard).
Tarefas: ADMIN-001..ADMIN-008
Dependências: AUTH-002, UI-003, DB-004 (DB-006 para métricas)
Modelo: Sonnet 5.5 (ADMIN-008: Haiku 5.5)
Esforço: médio; alto em ADMIN-003/004 (reordenação e uploads).
Justificativa: CRUDs com UX caprichada; RLS já protege.

AGENT A06 — STUDENT EXPERIENCE ENGINEER
Responsabilidade: landing, catálogo, página do curso, biblioteca, player, progresso, UX/perf.
Tarefas: STUDENT-001..007, UX-001, UX-003, UX-004
Dependências: UI-003, AUTH-002, ADMIN-004
Modelo: Sonnet 5.5 (UX-004: Haiku 5.5)
Esforço: alto no player (STUDENT-005/006) e landing; médio no resto.
Justificativa: a experiência de aprender é o coração do produto.

AGENT A07 — PAYMENTS ENGINEER
Responsabilidade: AbacatePay, checkout, webhook, concessão, reconciliação.
Tarefas: PAY-001..PAY-005
Dependências: PAY-001 livre; demais após DB-005/AUTH-002/STUDENT-003
Modelo: Opus 5.5 (PAY-001..003) · Sonnet 5.5 (PAY-004/005)
Esforço: alto (PAY-001: médio)
Justificativa: dinheiro + idempotência + segurança de webhook — erro aqui é prejuízo direto.

AGENT A08 — QA & SECURITY REVIEWER
Responsabilidade: infraestrutura de testes, e2e, revisão adversarial final, teste de pagamento.
Tarefas: QA-001..QA-004
Dependências: conforme tarefas
Modelo: Opus 5.5 (QA-002) · Sonnet 5.5 (demais)
Esforço: alto (QA-002), médio (demais)
Justificativa: revisão de segurança exige o modelo mais capaz; testes são mecânicos.

A01 também executa REL-001/003 (Haiku).
```

---

## 2. Execução

### 2.1 Paralelismo
```text
                 ┌── PAY-001 (pesquisa)
ARCH-001 ────────┼── ARCH-002 ── DB-001 → DB-002 → DB-003 → DB-004 → DB-005 ──┐
                 ├── ARCH-003                                                  │
                 └── UI-001 ── UI-002 ∥ UI-004 ── UI-003 ──────────────────────┤
                                                                               ▼
                                        AUTH-001 → AUTH-002 → AUTH-003
                                                       │
                       ADMIN-002 → ADMIN-003 → ADMIN-004      STUDENT-001/002/003
                                                       │
            STUDENT-005 → 006 → 007 → 004   ∥   PAY-002 → PAY-003 → PAY-004
                                                       │
                   DB-006 → ADMIN-001 ∥ ADMIN-005 → 006 ∥ ADMIN-007 ∥ PAY-005
                                                       │
                              UX-001..004 → QA-002 ∥ QA-003 ∥ QA-004 → REL
```
Núcleos com dono único (nunca dois agentes ao mesmo tempo): `supabase/migrations/` (A02), `src/lib/auth/` + `src/proxy.ts` (A04), `src/styles/tokens.css` + `src/components/ui|brand` (A03), `src/lib/payments/` (A07).

### 2.2 Ciclo
`MASTER PLAN → BACKLOG → próxima tarefa READY → DELEGAR (bloco §8.4) → agente implementa em branch → REVIEW pelo orquestrador (código, banco, frontend, UX, performance, segurança) → testes → integrar → atualizar este arquivo (§10) → próxima`.
Nenhuma tarefa vira DONE porque o agente disse "terminei". Problemas encontrados em revisão viram tarefas `FIX-xxx`.

### 2.3 Checklist de revisão (orquestrador)
- Código: correto, consistente com `docs/architecture.md`, sem duplicação, sem abstração desnecessária, tipado.
- Banco: RLS correta e testada, índices, constraints, migrations reversíveis/idempotentes onde possível.
- Segurança: checklist "usuário malicioso" de `docs/authorization.md`.
- Frontend: responsivo, acessível, loading/empty/error/success.
- Performance: queries necessárias apenas, sem waterfall evitável, sem JS desnecessário no client.

### Briefs de tarefa (regra de contexto — 2026-10-09)
- Cada tarefa delegada tem um brief em `docs/briefs/<ID>.md` (modelo: `docs/briefs/_TEMPLATE.md`), com no máximo ~60 linhas.
- O brief lista **só** os arquivos/seções que o agente deve ler (por caminho, nunca colando conteúdo) e o que ele **não** deve tocar.
- O agente não lê `docs/` inteiro nem o repositório inteiro; lê o brief e o que ele aponta, e procura (grep/glob) antes de abrir arquivos.
- Contexto de um agente não é replicado para outro: cada brief é escrito para a sua tarefa.
- Ao concluir, o orquestrador registra em `docs/changelog.md` só resumo, decisões e arquivos alterados, e atualiza o status no índice do `MASTER_PLAN.md`.
