# Desenvolvimento

> Comandos abaixo passam a valer após `ARCH-001`/`ARCH-002`. Atualize este arquivo se mudar algum.

## Requisitos
Node 22 LTS, npm, Supabase CLI (`npx supabase`), Docker (opcional, para Supabase local).

## Setup
```bash
npm install
cp .env.example .env.local      # preencher valores (ver docs/architecture.md §6)
npx supabase start              # Supabase local (Docker) — ou use um projeto dev remoto
npx supabase db reset           # aplica migrations + seed
npm run db:types                # gera src/types/database.ts
npm run dev
```

## Scripts (alvo)
| script | faz |
|---|---|
| `dev` / `build` / `start` | Next |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `format` | Prettier |
| `test` | Vitest (unit) |
| `test:e2e` | Playwright |
| `db:types` | `supabase gen types typescript --local > src/types/database.ts` |
| `db:test` | `supabase test db` (pgTAP) |

## Fluxo de trabalho
1. Pegue uma tarefa `READY` no `MASTER_PLAN.md` (ou receba um bloco de delegação).
2. Branch: `feat/<ID>-slug` (ou a branch indicada pelo orquestrador).
3. Commits pequenos, mensagem `<ID>: descrição` (ex.: `DB-001: create core course schema`).
4. Antes de entregar: `npm run lint && npm run typecheck && npm test && npm run build` (+ `db:test` se tocou banco).
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
