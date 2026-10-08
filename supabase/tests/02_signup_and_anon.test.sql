-- 02 — Cadastro (handle_new_user, ataque S1) e visitante anônimo
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(34);

-- ---------------------------------------------------------------------------
-- Fixtures (como dono do schema). Usuários entram por auth.users -> handle_new_user.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@test', '{"full_name":"Bia Compradora"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@test', '{"full_name":"Caio"}'),
  ('00000000-0000-0000-0000-00000000000d', 'davi@test', '{"full_name":"Davi"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eva@test', '{"full_name":"Eva"}'),
  ('00000000-0000-0000-0000-00000000000f', 'fabi@test', null),
  ('00000000-0000-0000-0000-0000000000ff', 'mal@test',
   '{"role":"admin","roles":["admin"],"is_admin":true,"full_name":"  Mal\u0007icioso \n\t  Hacker  "}');

-- Admin = papel gravado por quem tem acesso ao banco (equivale a supabase/scripts/grant-admin.sql).
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');

insert into public.categories (id, slug, name, position) values
  ('10000000-0000-0000-0000-000000000001', 'game-design', 'Game Design', 0);

-- P1 publicado, P2 arquivado, P3 rascunho
insert into public.courses (id, slug, title, price_cents, category_id, status) values
  ('20000000-0000-0000-0000-000000000001', 'godot-do-zero', 'Godot do Zero', 4990, '10000000-0000-0000-0000-000000000001', 'published'),
  ('20000000-0000-0000-0000-000000000002', 'curso-antigo', 'Curso Antigo', 1990, null, 'published'),
  ('20000000-0000-0000-0000-000000000003', 'rascunho', 'Rascunho', 2990, null, 'draft');
update public.courses set status = 'archived' where id = '20000000-0000-0000-0000-000000000002';

insert into public.course_modules (id, course_id, title, position) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'P1-M1', 0),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'P1-M2', 1),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'P2-M1', 0),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'P3-M1', 0);

insert into public.lessons (id, module_id, title, position, duration_seconds, is_preview) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'P1-L1 preview', 0, 300, true),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'P1-L2 paga', 1, 600, false),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'P1-L3 paga', 0, 900, false),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'P1-L4 paga', 1, 120, false),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'P2-L1', 0, 100, false),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', 'P3-L1 preview', 0, 100, true);

insert into public.lesson_materials (id, lesson_id, type, position, video_provider, video_id, body, storage_path) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'video', 0, 'youtube', 'prev123', null, null),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'text', 0, null, null, '# pago', null),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'file', 1, null, null, null, 'p1/l2/a-projeto.zip'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 'video', 0, 'vimeo', 'pago999', null, null),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', 'text', 0, null, null, '# arquivado', null),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', 'text', 0, null, null, '# rascunho preview', null);

-- Atribuições: C no rascunho, E no arquivado (concedidas pelo admin)
insert into public.enrollments (user_id, course_id, source, granted_by) values
  ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000003', 'admin_grant', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000002', 'admin_grant', '00000000-0000-0000-0000-00000000000a');

-- Linhas afetadas por um DML executado com o papel corrente.
create function pg_temp.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function pg_temp.affected(text) to public;

-- ---------------------------------------------------------------------------
-- Cadastro e ataque S1 (role=admin no metadata)
-- ---------------------------------------------------------------------------
select is((select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 7::bigint, 'todo usuário novo ganhou profile');
select is((select count(*) from public.user_roles where role = 'student' and user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 7::bigint,
  'todo usuário novo ganhou o papel student');
select ok(not exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000ff' and role = 'admin'),
  'S1: raw_user_meta_data com role=admin/is_admin NÃO gera papel admin');
select is((select array_agg(user_id) from public.user_roles where role = 'admin' and user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), array['00000000-0000-0000-0000-00000000000a'::uuid],
  'o único admin é o promovido pelo grant (via banco)');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000ff'), 'Mal icioso Hacker',
  'full_name do metadata é sanitizado (controle removido, espaços colapsados)');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000f'), '', 'metadata nulo -> full_name vazio');

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000a1', 'longo@test', jsonb_build_object('full_name', repeat('x', 500)));
select is((select char_length(full_name) from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 120,
  'full_name truncado em 120 caracteres');

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated","user_role":"admin"}';
set local role authenticated;
select ok(not public.is_admin(), 'S1: claim forjado (user_role=admin) não torna ninguém admin');
select throws_ok($$select * from public.admin_students()$$, '42501', null, 'S1: admin_students negado ao atacante');
select throws_ok($$insert into public.user_roles values ('00000000-0000-0000-0000-0000000000ff', 'admin')$$, '42501', null,
  'S1/S2: atacante não grava user_roles');

-- ---------------------------------------------------------------------------
-- ANON
-- ---------------------------------------------------------------------------
reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select is((select string_agg(slug, ',') from public.courses where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 'godot-do-zero', 'anon: vê só o curso publicado');
select is((select count(*) from public.course_modules where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 2::bigint, 'anon: módulos só do curso publicado');
select is((select count(*) from public.lessons where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 4::bigint, 'anon: ementa (aulas) só do curso publicado');
select is((select string_agg(id::text, ',') from public.lesson_materials where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), '50000000-0000-0000-0000-000000000001',
  'anon: só o material da aula preview do curso publicado (nem pagos, nem preview de rascunho)');
select is((select count(*) from public.lesson_materials where id = '50000000-0000-0000-0000-000000000002'), 0::bigint,
  'anon: material pago por id direto -> 0 linhas');
select is((select slug || '/' || lesson_count || '/' || total_duration_seconds || '/' || module_count || '/' || category_name
           from public.course_catalog where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')),
  'godot-do-zero/4/1920/2/Game Design', 'anon: course_catalog com contagens e categoria');
select is((select count(*) from public.course_outline where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 4::bigint, 'anon: course_outline só do publicado');
select is((select count(*) from public.categories where slug = 'game-design'), 1::bigint, 'anon: lê categorias');
select ok(not public.has_course_access('20000000-0000-0000-0000-000000000001'), 'anon: has_course_access = false (sem erro)');
select throws_ok($$select public.is_admin()$$, '42501', null, 'anon: is_admin sem EXECUTE');
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon: profiles negado');
select throws_ok($$select * from public.user_roles$$, '42501', null, 'anon: user_roles negado');
select throws_ok($$select * from public.enrollments$$, '42501', null, 'anon: enrollments negado');
select throws_ok($$select * from public.orders$$, '42501', null, 'anon: orders negado');
select throws_ok($$select * from public.payment_events$$, '42501', null, 'anon: payment_events negado');
select throws_ok($$select * from public.lesson_progress$$, '42501', null, 'anon: lesson_progress negado');
select throws_ok($$select * from public.my_library$$, '42501', null, 'anon: my_library negado');
select throws_ok($$insert into public.courses (slug, title) values ('x', 'x')$$, '42501', null, 'anon: INSERT courses negado');
select throws_ok($$update public.courses set price_cents = 1$$, '42501', null, 'anon: UPDATE courses negado');
select throws_ok($$delete from public.lesson_materials$$, '42501', null, 'anon: DELETE lesson_materials negado');
select throws_ok($$select public.fulfill_order('20000000-0000-0000-0000-000000000001', 'x', 1, null)$$, '42501', null, 'anon: fulfill_order negado');
select throws_ok($$select public.refund_order('20000000-0000-0000-0000-000000000001', null)$$, '42501', null, 'anon: refund_order negado');
select throws_ok($$select public.request_refund('20000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon: request_refund negado');
select throws_ok($$select * from public.admin_students()$$, '42501', null, 'anon: admin_students negado');

select * from finish();
rollback;
