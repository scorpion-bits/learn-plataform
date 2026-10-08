# Autenticação

## Provedor
Supabase Auth, **email + senha** no MVP. (OAuth Google/Discord: pós-MVP.) Confirmação de email **habilitada** em produção.

## Clients (`src/lib/supabase/`)
| arquivo | uso | chave |
|---|---|---|
| `browser.ts` | Client Components (raro: realtime/upload direto) | publishable |
| `server.ts` | Server Components, Server Actions, Route Handlers — lê/escreve cookies via `next/headers` | publishable + JWT do usuário |
| `service.ts` | **`import 'server-only'`**; webhook de pagamento e scripts | secret (service role) |

## Sessão
- `src/proxy.ts` (Next 16) chama `updateSession()` em toda rota não estática: renova cookies e redireciona anônimos que acessam rotas protegidas para `/entrar?next=<path>`.
- Validação de identidade no servidor com `supabase.auth.getClaims()` (verifica JWT localmente com JWKS; nunca `getSession()` para decisões de segurança).
- `src/lib/auth/dal.ts` (Data Access Layer), memoizado por request com `React.cache`:
  - `getCurrentUser()` → `{ id, email } | null`
  - `getCurrentRole()` → consulta `user_roles` (RLS: usuário lê o próprio)
  - `requireUser()` → redireciona para `/entrar`
  - `requireAdmin()` → `notFound()` para não-admin (não revela a existência do painel)
- **Toda** Server Action chama o guard correspondente na primeira linha. Guard em layout não protege actions.

## Telas
`/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/auth/callback` (troca code → sessão), `/conta` (nome, senha).

## Regras
- `signUp` envia apenas `full_name` em metadata. Papel é sempre `student` (trigger).
- Parâmetro `next` aceito apenas se começar com `/` e não com `//` (evita open redirect).
- Mensagens de erro de login genéricas ("Email ou senha inválidos").
- Rate limiting: o do Supabase Auth (configurar limites no dashboard).
- Senha mínima 8 caracteres (configurar no Supabase + validar com zod).
