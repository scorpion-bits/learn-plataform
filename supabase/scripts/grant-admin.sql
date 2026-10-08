-- =============================================================================
-- grant-admin.sql — concede o papel admin a um usuário EXISTENTE (ADR-005)
-- =============================================================================
-- Único caminho para criar admin: SQL executado por quem tem a connection
-- string do banco (owner/service). Nunca por metadata, cookie ou API pública.
--
-- Uso (o usuário precisa ter se cadastrado antes):
--   psql "$DATABASE_URL" -v email='pessoa@exemplo.com' -f supabase/scripts/grant-admin.sql
--
-- Local (supabase start):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v email='pessoa@exemplo.com' -f supabase/scripts/grant-admin.sql
--
-- Para revogar:
--   delete from public.user_roles ur using auth.users u
--    where ur.user_id = u.id and lower(u.email) = lower('pessoa@exemplo.com') and ur.role = 'admin';
-- =============================================================================

\set ON_ERROR_STOP on

\if :{?email}
\else
  \echo 'ERRO: informe o email com -v email=pessoa@exemplo.com'
  do $$ begin raise exception 'grant-admin: variável email ausente'; end $$;
\endif

select count(*) = 1 as user_found
from auth.users
where lower(email) = lower(:'email')
\gset

\if :user_found
  begin;

  insert into public.user_roles (user_id, role)
  select u.id, 'admin'
  from auth.users u
  where lower(u.email) = lower(:'email')
  on conflict (user_id, role) do nothing;

  select u.email, array_agg(r.role order by r.role) as roles
  from auth.users u
  join public.user_roles r on r.user_id = u.id
  where lower(u.email) = lower(:'email')
  group by u.email;

  commit;
\else
  \echo 'ERRO: nenhum usuário (ou mais de um) com esse email em auth.users. Cadastre-se primeiro.'
  do $$ begin raise exception 'grant-admin: usuário não encontrado'; end $$;
\endif
