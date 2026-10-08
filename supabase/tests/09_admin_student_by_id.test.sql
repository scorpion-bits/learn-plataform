-- 09 — admin_student_by_id (DB-009)
begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@test', '{"full_name":"Bia"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');

-- anon
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'anon: admin_student_by_id negado');

-- aluno
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select * from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'aluno: admin_student_by_id negado (nem o próprio)');

-- admin
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is((select email from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')), 'bia@test', 'admin: retorna o e-mail');
select is((select full_name from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')), 'Bia', 'admin: retorna o nome');
select is((select is_admin from public.admin_student_by_id('00000000-0000-0000-0000-00000000000a')), true, 'admin: is_admin refletido');
select is((select active_enrollments || '|' || total_spent_cents from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')), '0|0', 'admin: totais zerados sem compras');
select is((select count(*) from public.admin_student_by_id('00000000-0000-0000-0000-0000000000ee')), 0::bigint, 'admin: id inexistente -> 0 linhas');
select is((select count(*) from public.admin_student_by_id(null)), 0::bigint, 'admin: id nulo -> 0 linhas');

select * from finish();
rollback;
