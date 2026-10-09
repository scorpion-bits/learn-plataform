# Brief AUTH-004 — Página "Minha conta" (+ 404 de marca)

**Agente:** A04 · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Por quê
O menu do usuário (`src/components/layout/UserMenu.tsx`) e a tab bar (`StudentShell.tsx`) apontam para `/conta`, que hoje dá o 404 padrão do Next (tela preta sem marca). Reportado pelo produto em produção, logado como admin.

## Entregar
1. `src/app/(student)/(app)/conta/page.tsx` (+ `loading.tsx`, `error.tsx`). Funciona para aluno **e** admin (`requireUser`). Seções:
   - **Perfil:** email (somente leitura), nome (`full_name`), telefone e CPF (`phone`, `tax_id`; opcionais, mesma validação/normalização usada no checkout — procure em `src/lib/payments/tax-id.ts` e `src/features/checkout/`). Salvar via Server Action `userAction` + zod, UPDATE em `profiles` com o client do usuário (RLS + grants de coluna já permitem só essas colunas; veja `docs/authorization.md`).
   - **Senha:** nova senha + confirmação (mín. 8), `supabase.auth.updateUser({ password })`. Mensagens pt-BR para erro de sessão antiga/senha igual.
   - **Atalhos:** "Meus pedidos e reembolso" → `/conta/pedidos` (já existe); se admin (`getCurrentRole`), link "Painel admin" → `/admin`.
   - **Sair** (reuse a action de logout existente em `src/features/auth/`).
2. `src/app/not-found.tsx` na raiz: 404 com a identidade (tokens + componentes de `src/components/ui`/`brand`), texto pt-BR e links para `/` e `/cursos`. Sem dados privados.
3. Código em `src/features/account/` (`queries.ts`, `actions.ts`, `schemas.ts`, `components/`), seguindo os padrões de `src/features/auth/` e `src/features/orders/` (cabeçalho de página, estados, CSS Module com tokens).
4. Testes Vitest: schemas e actions (não autenticado rejeitado; só colunas permitidas; senha curta/divergente).

## Não fazer
- Não mudar banco/migrations, troca de email, exclusão de conta (DB-008), avatar upload.
- Não mexer em `src/features/orders/` nem nos shells, exceto se o link do menu precisar de ajuste.
- Não commitar.

## Pronto quando
Estados loading/empty/error/success, 360px com toque, teclado/leitor de tela. `npm run lint && npm run typecheck && npm test && npm run build` passam. Screenshots 390 e 1440 de `/conta` (pode usar `/dev/...` com dados falsos, como em `src/app/dev/admin-orders/page.tsx`) e do 404 em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/auth-004/`.
