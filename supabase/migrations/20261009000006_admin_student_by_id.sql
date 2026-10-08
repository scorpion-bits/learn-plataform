-- DB-009 — admin_student_by_id: perfil de um aluno (com email de auth.users) por id.
-- Mesma forma de uma linha de admin_students, sem total_count.

create function public.admin_student_by_id(p_user_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz,
  active_enrollments bigint,
  total_spent_cents bigint,
  last_order_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_student_by_id: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin'),
    p.created_at,
    (select pg_catalog.count(distinct e.course_id) from public.enrollments e
      where e.user_id = p.id and e.revoked_at is null),
    (select coalesce(pg_catalog.sum(o.amount_cents), 0)::bigint from public.orders o
      where o.user_id = p.id and o.status = 'paid'),
    (select pg_catalog.max(o.created_at) from public.orders o where o.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;
end;
$$;

comment on function public.admin_student_by_id(uuid) is
  'Admin: um aluno por id (mesma forma de admin_students, sem total_count). Zero linhas se não existir. Erro 42501 para não-admin.';

revoke all on function public.admin_student_by_id(uuid) from public, anon, authenticated;
grant execute on function public.admin_student_by_id(uuid) to authenticated;
