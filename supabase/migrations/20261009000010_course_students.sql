-- ADMIN-008 — admin_course_students: matrículas de um curso com aluno (email de auth.users),
-- origem, status e progresso, em uma consulta (sem N+1). Busca literal por nome/email.

create function public.admin_course_students(
  p_course_id uuid,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  enrollment_id uuid,
  user_id uuid,
  email text,
  full_name text,
  source public.enrollment_source,
  granted_at timestamptz,
  revoked_at timestamptz,
  lesson_count bigint,
  completed_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(pg_catalog.btrim(p_search), '');
  v_lessons bigint;
begin
  if not public.is_admin() then
    raise exception 'admin_course_students: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  select pg_catalog.count(*) into v_lessons from public.lessons l where l.course_id = p_course_id;

  return query
  select
    e.id,
    e.user_id,
    u.email::text,
    p.full_name,
    e.source,
    e.granted_at,
    e.revoked_at,
    v_lessons,
    least(
      (select pg_catalog.count(*) from public.lesson_progress lp
        where lp.user_id = e.user_id and lp.course_id = e.course_id and lp.completed_at is not null),
      v_lessons
    ),
    pg_catalog.count(*) over ()
  from public.enrollments e
  join public.profiles p on p.id = e.user_id
  join auth.users u on u.id = e.user_id
  where e.course_id = p_course_id
    and (v_search is null
      -- strpos: busca literal (sem curingas de LIKE vindos do input)
      or pg_catalog.strpos(pg_catalog.lower(u.email::text), pg_catalog.lower(v_search)) > 0
      or pg_catalog.strpos(pg_catalog.lower(p.full_name), pg_catalog.lower(v_search)) > 0)
  order by e.granted_at desc, e.id
  limit least(greatest(coalesce(p_limit, 20), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_course_students(uuid, text, integer, integer) is
  'Admin: matrículas de um curso (ativas e revogadas) com email, origem, aulas concluídas/total e total_count. Erro 42501 para não-admin.';

revoke all on function public.admin_course_students(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_course_students(uuid, text, integer, integer) to authenticated;
