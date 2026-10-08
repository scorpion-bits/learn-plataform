# Desenvolvimento

> Comandos abaixo passam a valer após `ARCH-001`/`ARCH-002`. Atualize este arquivo se mudar algum.

## Requisitos
Node 22 LTS, npm, Supabase CLI (`npx supabase`), Docker (opcional, para Supabase local).

## Setup
```bash
npm install
cp .env.example .env.local      # preencher valores (ver docs/architecture.md §6)
npm run db:start                # Supabase local (Docker) — ou use um projeto dev remoto
npm run db:reset                # aplica migrations + seed
npm run db:types                # gera src/types/database.ts
npm run dev
```

## Scripts
`test:e2e` (Playwright) ainda não existe; entra em tarefa futura.

| script | faz |
|---|---|
| `dev` / `build` / `start` | Next |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest (`vitest run`, jsdom; testes em `src/**/*.test.tsx`) |
| `test:watch` | Vitest em modo watch |
| `format` | Prettier |
| `db:types` | `supabase gen types typescript --local > src/types/database.ts` |
| `db:start` / `db:stop` | `supabase start` / `supabase stop` (Docker) |
| `db:reset` | `supabase db reset` (migrations + seed) |
| `db:test` | `supabase test db` (pgTAP) |

## Testes de banco (pgTAP)
Suíte em `supabase/tests/*.test.sql` (DB-005): cada arquivo é autocontido (`begin; select plan(n); … select * from finish(); rollback;`), cria suas próprias fixtures e desfaz tudo no fim, então pode rodar em qualquer ordem e em qualquer banco local. Usuários são simulados como o PostgREST faz: `set local role authenticated|anon|service_role` + `set local request.jwt.claims = '{"sub":"<uuid>",…}'`.

```bash
npm run db:start      # ou: npx supabase db start (só o Postgres; aplica migrations + seed) — requer Docker
npm run db:test       # supabase test db → pg_prove em supabase/tests
```

| arquivo | cobre |
|---|---|
| `01_structure` | RLS em todas as tabelas, `search_path` das `SECURITY DEFINER`, views `security_invoker`, EXECUTE por papel, grants mínimos |
| `02_signup_and_anon` | `handle_new_user` (S1: `role=admin` no metadata é ignorado), visitante anônimo |
| `03_student_without_access` | aluno sem acesso; ataques S2 (auto-promoção) e S8 (alterar pedido, chamar `fulfill_order`) |
| `04_student_with_access` | aluno com compra, reembolsado, curso arquivado, progresso, `my_library`, `request_refund` |
| `05_admin` | admin: conteúdo, reordenação, matrículas, venda manual, `admin_students`, o que nem admin escreve |
| `06_commerce_functions` | `fulfill_order` / `refund_order` (idempotência, divergências, duplicidade, dedupe de eventos) |
| `07_storage` | buckets (limites, MIME) e policies de `storage.objects` |

Regras para novos testes: **toda tarefa que muda tabela, policy, função ou bucket adiciona/ajusta testes aqui**; um teste de segurança deve falhar se a proteção for removida (confira revertendo a policy/grant). Arquivos `.sql` extras em `supabase/tests/` seriam executados como testes, então não coloque helpers ali. Se o Docker não estiver disponível, qualquer Postgres 15+ com `pgtap` e `pg_prove` serve, desde que tenha os papéis `anon`/`authenticated`/`service_role`, `auth.users`/`auth.uid()` e `storage.buckets/objects` (stubs mínimos), o schema `extensions` com `pgtap`, e as migrations aplicadas em ordem.

No CI, o job `db-test` (`.github/workflows/ci.yml`) roda `npx supabase db start` e `npx supabase test db`.

## Fluxo de trabalho
1. Pegue uma tarefa `READY` no `MASTER_PLAN.md` (ou receba um bloco de delegação).
2. Branch: `feat/<ID>-slug` (ou a branch indicada pelo orquestrador).
3. Commits pequenos, mensagem `<ID>: descrição` (ex.: `DB-001: create core course schema`).
4. Antes de entregar: `npm run lint && npm run typecheck && npm run build` (+ `npm run db:test` se tocou banco).
5. Entregue um resumo: o que fez, arquivos, decisões, pendências, como testar.
6. O orquestrador revisa, integra e atualiza o `MASTER_PLAN.md`. **Agentes não marcam a própria tarefa como DONE.**

## Padrões de código
- TypeScript strict; sem `any` (use tipos gerados do Supabase).
- Server Components por padrão; `'use client'` só onde há interação.
- Leitura em `src/features/<domínio>/queries.ts`; mutação em `actions.ts` (Server Actions) com: `requireX()` → `schema.parse()` → operação → `revalidatePath/Tag` → retorno `{ ok: true, data } | { ok: false, error }`.
- Nunca lançar erro cru para a UI; mensagens em pt-BR.
- CSS Modules + tokens; nada de cor/medida "mágica".
- Acessibilidade é critério de aceite, não extra.
- Next 16 tem breaking changes: consulte `node_modules/next/dist/docs/` antes de usar APIs de roteamento, cache, `proxy`, `params`.
