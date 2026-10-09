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
| script | faz |
|---|---|
| `dev` / `build` / `start` | Next |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest (`vitest run`, jsdom; testes em `src/**/*.test.tsx`) |
| `test:watch` | Vitest em modo watch |
| `test:e2e` | Playwright (ver "E2E" abaixo; precisa de Docker) |
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

## E2E (Playwright)
Robô que percorre a plataforma como usuário real em **Desktop Chrome, Pixel 7 e iPhone 14** (ADR-021), contra o Supabase local completo (Auth, Postgres, Storage, Mailpit) e um **mock da AbacatePay**. Specs em `e2e/*.spec.ts`: visitante, cadastro com confirmação por email, admin cria/publica curso, compra PIX (webhook e plano B por polling), atribuir/revogar, `/conta`, segurança básica e overflow horizontal.

Rodar local (precisa de Docker):
```bash
npx supabase start                        # sobe a stack local, aplica migrations + seed
bash e2e/scripts/write-env.sh             # gera .env.e2e.local a partir do `supabase status`
set -a; . ./.env.e2e.local; set +a        # NEXT_PUBLIC_* são embutidas no build
npm run build
npx playwright install chromium           # uma vez (ou use PLAYWRIGHT_BROWSERS_PATH)
npm run test:e2e                          # ou: npx playwright test --project=pixel-7 -g compra
npx playwright show-report                # relatório HTML (playwright-report/)
```
- **Como o app é servido**: o `webServer` do `playwright.config.ts` roda `npm run start` (app já buildado) em `127.0.0.1:3000` e reaproveita um servidor que já esteja de pé. Use `127.0.0.1` (não `localhost`): é o `site_url` do `supabase/config.toml`, e o link de confirmação de email depende disso.
- **Variáveis** (todas escritas por `write-env.sh`; o config lê `.env.e2e.local`, depois `.env`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (service role, só para montar dados nos testes), `NEXT_PUBLIC_SITE_URL`, `ABACATEPAY_API_KEY` (`abc_dev_e2e`), `ABACATEPAY_WEBHOOK_SECRET`, `ABACATEPAY_API_BASE_URL` (aponta o app para o mock), `E2E_MOCK_PORT` (4010), `E2E_MAILPIT_URL` (porta de `[local_smtp]`, 54324). Os testes **recusam** um Supabase que não seja loopback.
- **Mock da AbacatePay** (`e2e/mocks/abacatepay.ts`): sobe no `globalSetup` em `127.0.0.1:4010`. `POST /v2/transparents/create` valida o contrato e devolve `PENDING`; `GET …/check?id=` devolve o status; `POST …/simulate-payment?id=` marca `PAID` (o "pagar" do Dev mode); `POST …/refund` marca `REFUNDED`. O teste de compra paga no mock e então dispara o webhook real (`transparent.completed`, com segredo na URL e `X-Webhook-Signature`); o plano B só paga no mock e espera a reconsulta do polling. Testes do mock: `npx vitest run e2e` (rodam no `npm test`).
- **Cadastro**: com `enable_confirmations = false` (padrão do `config.toml`) o teste cai direto em `/inicio`; com `true` (o job `e2e` do CI liga isso numa cópia efêmera) ele abre o email no Mailpit (`/api/v1`) e segue o link. Para testar o caminho do email local, mude a flag temporariamente.
- **iPhone**: Chromium com o perfil do aparelho. WebKit real: `E2E_IPHONE_WEBKIT=1 npx playwright install webkit && npm run test:e2e -- --project=iphone-14`.
- **Escrevendo testes**: dados próprios por teste (`createUser`, `createPublishedCourse` em `e2e/support/service.ts`, e-mails únicos), sem depender de ordem; prefira `getByRole`/`getByLabel` com o texto pt-BR real; use `visit()`/`expectNoHorizontalOverflow()` nas telas. Nunca `test.skip` para esconder falha.
- **CI**: job `e2e` (depois de `ci`) em `.github/workflows/ci.yml`; em falha publica `playwright-report` e `test-results` (traces) como artifact. 1 retry no CI.

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

## Configuração manual no Supabase (por ambiente)
Checklist para o humano (ARCH-004 / REL-001):
- Auth → URL Configuration: **Site URL** = `NEXT_PUBLIC_SITE_URL`; **Redirect URLs**: `<SITE_URL>/auth/callback` para produção, previews da Vercel e `http://localhost:3000`.
- Auth → Providers → Email: senha mínima **8**; "Confirm email" ligado em produção (a tela de cadastro funciona com ou sem).
- Auth → Email Templates (Confirm signup, Reset password): usar `{{ .ConfirmationURL }}` e traduzir para pt-BR.
- `NEXT_PUBLIC_SITE_URL` definida em cada ambiente da Vercel.
- Admin inicial: `psql "$DATABASE_URL" -v email='...' -f supabase/scripts/grant-admin.sql`.
