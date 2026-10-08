# CLAUDE.md — Scorpion Bits Learn

Plataforma de cursos (game dev) da Scorpion Bits. Next.js 16 (App Router) · React 19 · TS strict · CSS Modules + tokens · Supabase (Auth, Postgres+RLS, Storage) · AbacatePay (PIX) · Vercel · Vitest · pgTAP.

## Como trabalhar (regras de contexto)
- **Não leia o repositório nem `docs/` inteiros.** Comece pelo seu brief (`docs/briefs/<ID>.md`) e leia só o que ele aponta; use grep/glob para achar o resto.
- `MASTER_PLAN.md` é só um **índice** (status das tarefas e onde está cada doc).
- Next 16 tem breaking changes (`src/proxy.ts` no lugar de middleware, `params` assíncronos): consulte `node_modules/next/dist/docs/` só para a API que for usar.

## Segurança (inegociável)
1. Autorização mora no banco (RLS em toda tabela). UI nunca decide permissão.
2. Papel admin só em `user_roles`, escrito pelo service role. Nunca de metadata/cookie/input.
3. Toda Server Action começa com `requireUser()`/`requireAdmin()` + validação `zod`.
4. Service role só em módulos `import 'server-only'` (webhook, pagamentos, signed URLs, scripts).
5. Nada secreto em `NEXT_PUBLIC_*`. Preço nunca vem do cliente.
6. Acesso por compra só via `fulfill_order()` chamado pelo webhook verificado.
7. Conteúdo pago: storage privado + signed URL curta; `Cache-Control: private, no-store`.
8. Redirects só para paths internos (`sanitizeNextPath`).

## Padrões
- Código/DB em inglês; UI/docs em pt-BR. Server Components por padrão.
- Leitura em `src/features/<domínio>/queries.ts`, mutação em `actions.ts`, schemas em `schemas.ts`.
- Banco só por migration em `supabase/migrations/` + teste. Estilo só com tokens (`src/styles/tokens.css`). Sem libs novas sem ADR.
- Toda tela: loading, empty, error, success, 360px com toque, teclado/leitor de tela.

## Entrega (agentes)
Trabalhe só na sua tarefa; respeite o "Não fazer" do brief. Antes de entregar: `npm run lint && npm run typecheck && npm test && npm run build`. Não faça commit/push nem marque a tarefa como DONE — o orquestrador revisa.

Setup e scripts: `docs/development.md`. Envs: `.env.example`.
