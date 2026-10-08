# AUTH-003 — Telas de autenticação

**Agente:** A04 Authentication · **Modelo:** Sonnet 5.5 · **Esforço:** médio

## Objetivo
Criar `/entrar`, `/cadastro`, `/recuperar-senha` e `/redefinir-senha` com Server Actions, visual Scorpion Bits e ótima experiência no celular.

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `AUTH-003`
- `docs/authentication.md` (seções Sessão e Regras)
- `src/lib/auth/actions.ts`, `src/lib/auth/redirect.ts`, `src/lib/auth/dal.ts` (só as assinaturas), `src/features/auth/actions.ts`
- `src/app/(auth)/layout.tsx` e seu CSS
- Componentes a usar: `src/components/ui/index.ts` (Field, Input, Button, TextLink, Toast) e `src/components/brand/index.ts` (só se precisar)

## Regras
- Actions em `src/features/auth/actions.ts` com `zod` (`src/features/auth/schemas.ts`); formulários com `useActionState` + `Button pending`.
- `signUp` envia só `full_name` em metadata (nunca `role`); `emailRedirectTo` = `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/inicio`.
- Login: erro genérico "Email ou senha inválidos"; após sucesso, redirect por papel (`getCurrentRole()`: admin → `/admin`, senão `sanitizeNextPath(next)`).
- Recuperação: sempre a mesma mensagem ("Se o email existir, enviaremos um link"), sem revelar se a conta existe; link → `/auth/callback?next=/redefinir-senha`.
- Redefinir: exige sessão (link do email); senha ≥ 8 com confirmação.
- Tratar `?erro=link-invalido` em `/entrar` com mensagem amigável.
- Cadastro com confirmação de email: mostrar estado "Confira seu email" (não fingir login).
- Mobile: inputs com `autoComplete`/`inputMode` corretos, foco no primeiro campo, mostrar/ocultar senha, sem zoom no iOS.

## Critérios de aceite
- Teclado e leitor de tela: labels, erros por campo (`fieldErrors`), foco no primeiro erro.
- Testes Vitest dos schemas e das actions (Supabase mockado): role nunca enviado, mensagem genérica no login, recuperação sem enumeração.
- `typecheck`, `lint`, `test`, `build` passam sem env.
- Screenshots de `/entrar` e `/cadastro` em 390 e 1440 em `/tmp/claude-0/-home-user-learn-plataform/d815b849-49f4-599a-a15c-8d6daf74274c/scratchpad/auth-003/` (env fake; servidor encerrado ao final).

## Não fazer
- Não alterar `src/lib/auth/*`, `src/proxy.ts`, `supabase/`, `.github/`, `src/features/materials/`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · caminhos dos screenshots · configurações que o humano precisa fazer no Supabase (redirect URLs, templates de email).
