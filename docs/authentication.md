# Autenticação

## Provedor
Supabase Auth, **email + senha** no MVP. (OAuth Google/Discord: pós-MVP.) Confirmação de email **habilitada** em produção.

## Clients (`src/lib/supabase/`)
| arquivo | uso | chave |
|---|---|---|
| `browser.ts` | Client Components (raro: realtime/upload direto) | publishable |
| `server.ts` | Server Components, Server Actions, Route Handlers — lê/escreve cookies via `next/headers` | publishable + JWT do usuário |
| `service.ts` | **`import 'server-only'`**; webhook de pagamento e scripts | secret (service role) |

## Sessão (implementado em AUTH-001/002)
- `src/proxy.ts` (Next 16) chama `updateSession()` (`src/lib/supabase/proxy.ts`) em toda rota não estática (o matcher exclui `_next/*`, arquivos com extensão, metadados e `/api/webhooks`). Ele só **valida o JWT** (`getClaims()`, sem consulta ao banco), renova os cookies e aplica as regras de `src/lib/auth/routes.ts`:
  - anônimo em `/inicio`, `/minha-biblioteca`, `/aprender/**`, `/conta`, `/checkout/**`, `/admin/**` -> `/entrar?next=<path+query>`;
  - logado em `/entrar` ou `/cadastro` -> `next` sanitizado (padrão `/inicio`). `/recuperar-senha` e `/redefinir-senha` **não** redirecionam logados (a recuperação cria uma sessão).
  - Redirects do proxy copiam os cookies renovados (`redirectWithSession`). Sem env do Supabase: rotas públicas passam; protegidas e de entrada **falham fechado** (erro 500).
  - O proxy **não** conhece papel: admin é checado em `requireAdmin()` e no banco.
- Identidade no servidor: `supabase.auth.getClaims()` (nunca `getSession()` para decisões de segurança).
- `src/lib/auth/dal.ts` (`server-only`, memoizado por request com `React.cache`):
  - `getCurrentUser()` -> `{ id, email } | null` (JWT; sem banco)
  - `getCurrentProfile()` -> `{ id, fullName, avatarUrl } | null` (`profiles`; degrada para o email se faltar)
  - `getCurrentRole()` -> `'admin' | 'student' | null`, **sempre** de `user_roles` (RLS: usuário lê o próprio). Erro do banco lança (não vira `student`).
  - `requireUser()` -> anônimo: `redirect('/entrar')`
  - `requireAdmin()` -> anônimo: `/entrar`; não-admin: `notFound()` (não revela o painel)
- `src/lib/auth/actions.ts`: `userAction(schema, handler)` / `adminAction(schema, handler)`. Ordem fixa: **guard -> zod -> handler**. Retorno `ActionResult<T>` = `{ ok: true, data } | { ok: false, error, fieldErrors? }`. Aceita objeto ou `FormData`. Erros esperados: `throw new ActionError(msg, fieldErrors?)`; `redirect()`/`notFound()` e erros inesperados propagam. Com `useActionState`: `(prev, formData) => minhaAction(formData)`.
- `src/lib/auth/redirect.ts`: `sanitizeNextPath(raw, fallback = '/inicio')`. Só aceita path interno; rejeita `//x`, barra invertida, esquemas (`https:`, `javascript:`), `%2F%2F`/`%5C` (também em dupla codificação), controle/espaços/invisíveis, URLs malformadas, mais de 2048 caracteres e `/entrar`/`/cadastro` (loop). Use **sempre** que ler `next`.
- `src/app/auth/callback/route.ts` (GET): troca `code` (PKCE) ou `token_hash`+`type` por sessão e redireciona para `next` sanitizado; falha -> `/entrar?erro=link-invalido`.
- Logout: `signOut` (Server Action em `src/features/auth/actions.ts`) enviada por `<form>` POST no `UserMenu`; nunca GET.
- Layouts: `(public)` usa `getCurrentUser()` só para trocar os botões do header (falha vira visitante); `(student)` e `(student)/(app)` chamam `requireUser()`; `admin` chama `requireAdmin()`. Rotas que leem cookies são **dinâmicas** (inclui as públicas, por causa do layout); o build não chama o Supabase.
- **Toda** Server Action chama o guard correspondente (use `userAction`/`adminAction`). Guard em layout não protege actions nem navegação client-side: páginas e queries também checam, e a RLS é a barreira final.

## Telas
`/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/auth/callback` (troca code → sessão), `/conta` (nome, senha).

## Regras
- `signUp` envia apenas `full_name` em metadata. Papel é sempre `student` (trigger).
- Parâmetro `next` passa por `sanitizeNextPath` (ver acima); testes de ataque em `src/lib/auth/redirect.test.ts`.
- Mensagens de erro de login genéricas ("Email ou senha inválidos").
- Rate limiting: o do Supabase Auth (configurar limites no dashboard).
- Senha mínima 8 caracteres (configurar no Supabase + validar com zod).
