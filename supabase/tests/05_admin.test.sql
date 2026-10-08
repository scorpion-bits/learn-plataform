-- 05 — Admin: gestão de conteúdo, matrículas, venda manual e limites
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(50);

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

insert into public.orders (id, user_id, course_id, amount_cents, provider_billing_id, expires_at) values
  ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_b', now() + interval '1 hour'),
  ('60000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_d', now() + interval '1 hour'),
  ('60000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_f', now() + interval '1 hour'),
  ('60000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_c1', now() + interval '1 hour');
-- B, D e F pagam via fulfill_order (único caminho de compra); D é reembolsado; F pagou há 8 dias.
do $$ begin
  perform public.fulfill_order('60000000-0000-0000-0000-00000000000b', 'pix_char_b', 4990, null);
  perform public.fulfill_order('60000000-0000-0000-0000-00000000000d', 'pix_char_d', 4990, null);
  perform public.refund_order('60000000-0000-0000-0000-00000000000d', null);
  perform public.fulfill_order('60000000-0000-0000-0000-00000000000f', 'pix_char_f', 4990, null);
end $$;
update public.orders set paid_at = now() - interval '8 days' where id = '60000000-0000-0000-0000-00000000000f';
update public.orders set status = 'canceled' where id = '60000000-0000-0000-0000-0000000000c1';

-- Linhas afetadas por um DML executado com o papel corrente.
create function pg_temp.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function pg_temp.affected(text) to public;

insert into public.payment_events (provider_event_id, event_type, payload) values
  ('evt_a', 'transparent.completed', '{}'), ('evt_b', 'transparent.refunded', '{}');
insert into public.lesson_progress (user_id, lesson_id, completed_at) values ('00000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000002', now());

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select ok(public.is_admin(), 'admin: is_admin = true (papel vem de user_roles)');
select is((select count(*) from public.courses where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 3::bigint, 'admin: vê todos os cursos (publicado, arquivado, rascunho)');
select is((select count(*) from public.lesson_materials where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 6::bigint, 'admin: vê todos os materiais, inclusive de rascunho');
select is((select count(*) from public.course_catalog where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 1::bigint, 'admin: course_catalog lista só publicados');
select is((select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 7::bigint, 'admin: vê todos os profiles');
select is((select count(*) from public.user_roles where user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 8::bigint, 'admin: vê todos os papéis');
select is((select count(*) from public.orders where user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 4::bigint, 'admin: vê todos os pedidos');
select is((select count(*) from public.payment_events where provider_event_id in ('evt_a', 'evt_b')), 2::bigint, 'admin: lê payment_events');
select is((select count(*) from public.enrollments where user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 5::bigint, 'admin: vê todas as matrículas (inclusive revogadas)');
select is((select count(*) from public.lesson_progress where user_id = '00000000-0000-0000-0000-00000000000b'), 1::bigint, 'admin: lê progresso de qualquer aluno');
select is((select count(*) from public.my_library), 0::bigint, 'admin: my_library mostra só as matrículas dele (nenhuma)');

-- conteúdo
select lives_ok($$insert into public.courses (id, slug, title, price_cents) values ('20000000-0000-0000-0000-0000000000a1', 'novo-curso', 'Novo', 100);
  insert into public.course_modules (id, course_id, title, position) values ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'M', 0);
  insert into public.lessons (module_id, title, position) values ('30000000-0000-0000-0000-0000000000a1', 'L', 0)$$,
  'admin: cria curso, módulo e aula');
select lives_ok($$update public.courses set status = 'published', title = 'Novo!' where id = '20000000-0000-0000-0000-0000000000a1'$$, 'admin: publica e edita curso');
select lives_ok($$delete from public.courses where id = '20000000-0000-0000-0000-0000000000a1'$$, 'admin: exclui curso sem vendas');
select lives_ok($$insert into public.categories (slug, name, position) values ('arte-2d', 'Arte 2D', 1); delete from public.categories where slug = 'arte-2d'$$,
  'admin: CRUD de categoria');
select lives_ok($$insert into public.lesson_materials (lesson_id, type, position, body) values ('40000000-0000-0000-0000-000000000002', 'text', 9, 'novo')$$,
  'admin: cria material');
select lives_ok($$select public.reorder_modules('20000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001']::uuid[])$$, 'admin: reorder_modules');
select is((select string_agg(title, ',' order by position) from public.course_modules where course_id = '20000000-0000-0000-0000-000000000001'), 'P1-M2,P1-M1', 'admin: módulos reordenados');
select lives_ok($$select public.reorder_lessons('30000000-0000-0000-0000-000000000001', array['40000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001']::uuid[])$$, 'admin: reorder_lessons');
select lives_ok($$select public.reorder_materials('40000000-0000-0000-0000-000000000002', array['50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000002', (select id from public.lesson_materials where body = 'novo')]::uuid[])$$,
  'admin: reorder_materials');
select throws_ok($$select public.reorder_modules('20000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000002']::uuid[])$$, '22023', null, 'admin: reorder com lista incompleta');
select throws_ok($$select public.reorder_modules('20000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002']::uuid[])$$, '22023', null, 'admin: reorder com id repetido');
select throws_ok($$select public.reorder_modules('20000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003']::uuid[])$$, '22023', null, 'admin: reorder com id de outro curso');

-- matrículas
select lives_ok($$insert into public.enrollments (user_id, course_id, source, granted_by) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'admin_grant', '00000000-0000-0000-0000-00000000000a')$$, 'admin: concede admin_grant (granted_by = ele)');
select ok(public.has_course_access('20000000-0000-0000-0000-000000000001'), 'admin: has_course_access = true em qualquer curso');
select throws_ok($$insert into public.enrollments (user_id, course_id, source, granted_by) values ('00000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000001', 'admin_grant', '00000000-0000-0000-0000-00000000000b')$$, '42501', null,
  'admin: admin_grant em nome de outro usuário (granted_by forjado) negado');
select throws_ok($$insert into public.enrollments (user_id, course_id, source, granted_by) values ('00000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000001', 'purchase', '00000000-0000-0000-0000-00000000000a')$$, '23514', null,
  'admin: INSERT direto de purchase sem pedido pago negado (constraint/trigger)');
select throws_ok($$insert into public.enrollments (user_id, course_id, source, order_id) values ('00000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-00000000000b')$$, '42501', null,
  'admin: INSERT de purchase apontando para pedido pago alheio negado (order_id sem grant de coluna)');
select throws_ok($$update public.enrollments set revoked_at = now(), revoked_by = '00000000-0000-0000-0000-00000000000b', revoke_reason = 'x' where user_id = '00000000-0000-0000-0000-00000000000c' and course_id = '20000000-0000-0000-0000-000000000001' and source = 'admin_grant' and revoked_at is null$$,
  '42501', null, 'admin: revogar assinando como outro usuário negado');
select lives_ok($$update public.enrollments set revoked_at = now(), revoked_by = '00000000-0000-0000-0000-00000000000a', revoke_reason = 'fim da cortesia' where user_id = '00000000-0000-0000-0000-00000000000c' and course_id = '20000000-0000-0000-0000-000000000001' and source = 'admin_grant' and revoked_at is null$$,
  'admin: revoga admin_grant');
select throws_ok($$insert into public.enrollments (id, user_id, course_id, source, granted_by) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 'admin_grant', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'admin: escolher o id da matrícula (coluna sem grant) negado');
select throws_ok($$update public.enrollments set source = 'purchase' where user_id = '00000000-0000-0000-0000-00000000000c' and course_id = '20000000-0000-0000-0000-000000000001'$$, '42501', null,
  'admin: trocar a origem da matrícula (coluna sem grant) negado');
select throws_ok($$delete from public.enrollments$$, '42501', null, 'admin: DELETE enrollments negado (histórico permanente)');

-- pedidos / eventos / papéis (nem admin escreve direto)
select throws_ok($$update public.orders set status = 'paid'$$, '42501', null, 'admin: UPDATE orders direto negado');
select throws_ok($$insert into public.orders (user_id, course_id, amount_cents) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 1)$$, '42501', null, 'admin: INSERT orders direto negado');
select throws_ok($$insert into public.payment_events (provider_event_id, event_type, payload) values ('x', 'x', '{}')$$, '42501', null, 'admin: INSERT payment_events direto negado');
select throws_ok($$select public.fulfill_order('60000000-0000-0000-0000-0000000000c1', 'pix_char_c1', 4990, null)$$, '42501', null, 'admin: fulfill_order (só service role) negado');
select throws_ok($$select public.refund_order('60000000-0000-0000-0000-00000000000b', null)$$, '42501', null, 'admin: refund_order (só service role) negado');
select throws_ok($$insert into public.user_roles values ('00000000-0000-0000-0000-00000000000c', 'admin')$$, '42501', null, 'admin: promover pela API (user_roles) negado');
select is(pg_temp.affected($$update public.profiles set full_name = 'x' where id = '00000000-0000-0000-0000-00000000000c'$$), 0::bigint, 'admin: não edita profile alheio (0 linhas)');

-- venda manual
select isnt(public.admin_record_manual_sale('00000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000001', null), null, 'admin: venda manual devolve o id do pedido');
select is(
  (select count(*) from public.orders where user_id = '00000000-0000-0000-0000-0000000000ff' and source = 'manual' and status = 'paid' and amount_cents = 4990 and created_by = '00000000-0000-0000-0000-00000000000a'), 1::bigint,
  'venda manual: pedido manual pago com o preço do banco, created_by = admin');
select is((select count(*) from public.enrollments where user_id = '00000000-0000-0000-0000-0000000000ff' and source = 'purchase' and revoked_at is null), 1::bigint,
  'venda manual: matrícula purchase ativa criada junto');
select throws_ok($$select public.admin_record_manual_sale('00000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000001', null)$$, '23505', null, 'admin: venda manual duplicada negada');
select throws_ok($$select public.admin_record_manual_sale('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000003', null)$$, '22023', null, 'admin: venda manual de curso não publicado negada');
select throws_ok($$select public.admin_record_manual_sale('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 0)$$, '22023', null, 'admin: venda manual com valor 0 negada');

-- admin_students
select is((select count(*) from public.admin_students() where user_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000ff')), 7::bigint, 'admin_students: lista todos com e-mail');
select is((select email || '|' || active_enrollments || '|' || total_spent_cents from public.admin_students('BIA@')), 'bia@test|1|4990',
  'admin_students: busca por e-mail (sem diferenciar maiúsculas) com totais');
select is((select count(*) from public.admin_students('%')), 0::bigint, 'admin_students: % no input é literal (sem curinga)');
select is((select count(*) from public.admin_students(null, 3, 0)), 3::bigint, 'admin_students: paginação respeita o limite');

select * from finish();
rollback;
