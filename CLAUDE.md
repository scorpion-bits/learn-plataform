# CLAUDE.md — Scorpion Bits Learn

Plataforma de cursos online da **Scorpion Bits** (estúdio de jogos indie), começando por **desenvolvimento de jogos**.
Recriação do antigo "Learn/KodaBooks" (loja de PDFs) como plataforma de aprendizagem real: curso → módulos → aulas → materiais, progresso, área admin e pagamentos.

## Leia antes de qualquer tarefa
1. Este arquivo.
2. `MASTER_PLAN.md` — estado atual, backlog, quem faz o quê. **Fonte da verdade do projeto.**
3. Os docs relevantes:
   - `docs/architecture.md` — stack, pastas, rotas, fluxos, envs
   - `docs/database.md` — schema e convenções
   - `docs/authentication.md` / `docs/authorization.md` — sessão, papéis, RLS, checklist de segurança
   - `docs/payments.md` — AbacatePay
   - `docs/design-system.md` — identidade visual e componentes
   - `docs/development.md` — setup, scripts, padrões de código, fluxo de trabalho
   - `docs/decisions.md` — ADRs (não contradiga uma ADR aceita sem propor outra)
   - `docs/audit.md` — o que havia de errado no sistema antigo (não repita)
   - `docs/post-mvp.md` — ideias fora do MVP (não implementar sem tarefa no backlog)

## Stack
Next.js 16 (App Router) · React 19 · TypeScript strict · CSS Modules + tokens · Supabase (Auth, Postgres+RLS, Storage) · AbacatePay · Vercel · Vitest · Playwright · pgTAP.

> **Next 16 tem breaking changes** (ex.: `middleware.ts` → `src/proxy.ts`, `params`/`searchParams` assíncronos). Consulte `node_modules/next/dist/docs/` antes de usar APIs de roteamento/cache.

## Estado atual
Ver `MASTER_PLAN.md` §0. (Em 2026-10-08: plano aprovado; Onda 1 — ARCH-001 e PAY-001 — em andamento.)

## Regras de segurança (inegociáveis)
1. **Autorização mora no banco.** Toda tabela com RLS. Frontend nunca decide permissão (`if (role === 'admin')` na UI é só UX).
2. Papel admin **só** via `user_roles` escrito pelo service role. Nunca ler papel de `user_metadata`, cookie ou input.
3. Toda Server Action começa com `requireUser()`/`requireAdmin()` e valida input com `zod`. Server Actions são endpoints públicos.
4. Service role (`SUPABASE_SECRET_KEY`) só em módulos com `import 'server-only'`, e apenas para webhook/pagamentos e scripts.
5. Nada secreto em `NEXT_PUBLIC_*`.
6. Preço nunca vem do cliente. Acesso por compra só via `fulfill_order()` chamado pelo webhook verificado.
7. Conteúdo pago: storage privado + signed URL curta gerada após checar `has_course_access`; respostas com `Cache-Control: private, no-store`.
8. Validar `next`/redirects (apenas paths internos).
9. Pergunte sempre: *"o que acontece se um usuário malicioso chamar isso diretamente?"*

## Padrões
- Código/DB em inglês; UI e docs em pt-BR; URLs públicas em pt-BR.
- Server Components por padrão; `'use client'` só para interação.
- Leitura em `src/features/<domínio>/queries.ts`, mutação em `actions.ts`, schemas em `schemas.ts`.
- Mudanças de banco **somente** por migration em `supabase/migrations/` + teste pgTAP.
- Estilo só com tokens de `src/styles/tokens.css`; sem Tailwind/UI kits (ADR-003). Sem novas libs sem ADR (ADR-013).
- Cada tela precisa de: loading, empty, error, success, mobile (360px), acessibilidade (teclado/leitor de tela).
- Percepção de velocidade: feedback imediato no clique, skeletons, `useOptimistic` quando seguro, prefetch. Nunca fingir sucesso.
- Sem overengineering: nada de microsserviços, filas, camadas extras.

## Como executar
Ver `docs/development.md` (comandos passam a valer após ARCH-001/002).

## Variáveis de ambiente
Ver `docs/architecture.md` §6 e `.env.example`.

## Fluxo para agentes
- Trabalhe apenas na tarefa recebida (ID do backlog). Respeite o "DO NOT" do bloco de delegação.
- Não edite núcleos de outro agente (ver `MASTER_PLAN.md` §8.1) sem coordenação.
- Commits: `<ID>: descrição`. Antes de entregar: lint, typecheck, testes, build.
- Entregue um resumo (o que fez, arquivos, decisões, pendências, como testar). **Não marque sua tarefa como DONE** — o orquestrador revisa e atualiza o `MASTER_PLAN.md`.
- Decisão estrutural nova → proponha ADR em `docs/decisions.md` com status `proposta`.
