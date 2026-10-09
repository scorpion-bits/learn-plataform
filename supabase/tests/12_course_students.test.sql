-- 12 — admin_course_students (ADMIN-008)
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@test', '{"full_name":"Bia"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@test', '{"full_name":"Caio"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');

insert into public.courses (id, slug, title, status, price_cents)
  values ('00000000-0000-0000-0000-0000000000c1', 'curso-x', 'Curso X', 'published', 1000);
insert into public.course_modules (id, course_id, title, position)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'M1', 0);
insert into public.lessons (id, module_id, course_id, title, position) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'A1', 0),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'A2', 1);
insert into public.enrollments (user_id, course_id, source, granted_by) values
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c1', 'admin_grant', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c1', 'admin_grant', '00000000-0000-0000-0000-00000000000a');
insert into public.lesson_progress (user_id, lesson_id, course_id, completed_at)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', now());

-- anon
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from public.admin_course_students('00000000-0000-0000-0000-0000000000c1')$$, '42501', null, 'anon: negado');

-- aluno
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select * from public.admin_course_students('00000000-0000-0000-0000-0000000000c1')$$, '42501', null, 'aluno: negado');

-- admin
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.admin_course_students('00000000-0000-0000-0000-0000000000c1')), 2::bigint, 'admin: 2 matriculados');
select is((select total_count from public.admin_course_students('00000000-0000-0000-0000-0000000000c1') limit 1), 2::bigint, 'admin: total_count');
select is((select completed_count || '/' || lesson_count from public.admin_course_students('00000000-0000-0000-0000-0000000000c1', 'bia')), '1/2', 'admin: progresso 1/2');
select is((select email from public.admin_course_students('00000000-0000-0000-0000-0000000000c1', 'CAIO@')), 'caio@test', 'admin: busca por email (case-insensitive)');
select is((select count(*) from public.admin_course_students('00000000-0000-0000-0000-0000000000c1', '%')), 0::bigint, 'admin: curinga literal não casa');
select is((select count(*) from public.admin_course_students('00000000-0000-0000-0000-0000000000c1', null, 1, 1)), 1::bigint, 'admin: paginação');
select is((select count(*) from public.admin_course_students('00000000-0000-0000-0000-0000000000ee')), 0::bigint, 'admin: curso inexistente -> 0 linhas');

select * from finish();
rollback;
