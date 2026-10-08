-- 03 — Aluno SEM acesso (Caio) e ataques S2/S8
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

-- Dados que o Caio NÃO pode enxergar/alterar
insert into public.payment_events (provider_event_id, event_type, payload) values ('evt_x', 'transparent.completed', '{}');
insert into public.lesson_progress (user_id, lesson_id, completed_at) values ('00000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000002', now());

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
set local role authenticated;
select ok(not public.is_admin(), 'caio: is_admin = false');
select is((select string_agg(slug, ',') from public.courses where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 'godot-do-zero',
  'caio: vê só o curso publicado (nem o rascunho em que tem admin_grant, nem o arquivado)');
select ok(not public.has_course_access('20000000-0000-0000-0000-000000000001'), 'caio: has_course_access(publicado sem compra) = false');
select ok(not public.has_course_access('20000000-0000-0000-0000-000000000003'), 'caio: has_course_access(rascunho atribuído) = false (rascunho nunca)');
select is((select string_agg(id::text, ',') from public.lesson_materials where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), '50000000-0000-0000-0000-000000000001',
  'caio: materiais pagos invisíveis (só a aula preview)');
select is((select count(*) from public.lesson_materials where id = '50000000-0000-0000-0000-000000000002'), 0::bigint,
  'caio: material pago por id direto -> 0 linhas');
select is((select count(*) from public.lesson_materials where id = '50000000-0000-0000-0000-000000000006'), 0::bigint,
  'caio: preview de curso em rascunho -> 0 linhas');
select is((select count(*) from public.my_library), 0::bigint, 'caio: my_library vazia (rascunho não aparece)');
select is((select count(*) from public.profiles), 1::bigint, 'caio: vê só o próprio profile');
select is((select string_agg(role::text, ',') from public.user_roles), 'student', 'caio: vê só o próprio papel');
select is((select count(*) from public.enrollments), 1::bigint, 'caio: vê só as próprias matrículas');
select is((select count(*) from public.orders), 1::bigint, 'caio: vê só os próprios pedidos');
select is((select count(*) from public.payment_events), 0::bigint, 'caio: payment_events -> 0 linhas');
select is((select count(*) from public.lesson_progress), 0::bigint, 'caio: progresso alheio invisível');

-- perfil
select lives_ok($$update public.profiles set full_name = 'Caio S.', phone = '11999998888', tax_id = '12345678901' where id = '00000000-0000-0000-0000-00000000000c'$$,
  'caio: atualiza o próprio nome/telefone/CPF');
select is(pg_temp.affected($$update public.profiles set full_name = 'hackeado' where id = '00000000-0000-0000-0000-00000000000b'$$), 0::bigint,
  'caio: UPDATE em profile alheio afeta 0 linhas');
select throws_ok($$update public.profiles set id = gen_random_uuid() where id = '00000000-0000-0000-0000-00000000000c'$$, '42501', null, 'caio: não altera id do profile');
select throws_ok($$update public.profiles set created_at = now() where id = '00000000-0000-0000-0000-00000000000c'$$, '42501', null, 'caio: não altera created_at do profile');
select throws_ok($$insert into public.profiles (id) values (gen_random_uuid())$$, '42501', null, 'caio: não insere profile');
select throws_ok($$delete from public.profiles$$, '42501', null, 'caio: não apaga profile');

-- S2: auto-promoção
select throws_ok($$insert into public.user_roles values ('00000000-0000-0000-0000-00000000000c', 'admin')$$, '42501', null, 'S2: INSERT user_roles admin negado');
select throws_ok($$update public.user_roles set role = 'admin'$$, '42501', null, 'S2: UPDATE user_roles role=admin negado');
select throws_ok($$delete from public.user_roles$$, '42501', null, 'S2: DELETE user_roles negado');
select ok(not public.is_admin(), 'S2: depois das tentativas, continua sem ser admin');

-- matrículas (auto-concessão)
select throws_ok($$insert into public.enrollments (user_id, course_id, source, granted_by) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'admin_grant', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'caio: auto-concede admin_grant (RLS exige admin)');
select throws_ok($$insert into public.enrollments (user_id, course_id, source, order_id) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'caio: insere matrícula purchase (sem grant de INSERT)');
select is(pg_temp.affected($$update public.enrollments set revoked_at = now(), revoked_by = '00000000-0000-0000-0000-00000000000c', revoke_reason = 'x'$$), 0::bigint,
  'caio: não revoga nem a própria matrícula (0 linhas)');
select throws_ok($$delete from public.enrollments$$, '42501', null, 'caio: DELETE enrollments negado');

-- S8: pedidos
select throws_ok($$insert into public.orders (user_id, course_id, amount_cents) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 1)$$, '42501', null, 'S8: INSERT orders negado');
select throws_ok($$update public.orders set status = 'paid', paid_at = now()$$, '42501', null, 'S8: marcar pedido como pago negado');
select throws_ok($$update public.orders set amount_cents = 1$$, '42501', null, 'S8: alterar valor do pedido negado');
select throws_ok($$update public.orders set refund_requested_at = now()$$, '42501', null, 'S8: escrever refund_requested_at direto negado');
select throws_ok($$delete from public.orders$$, '42501', null, 'S8: DELETE orders negado');
select throws_ok($$insert into public.payment_events (provider_event_id, event_type, payload) values ('x', 'x', '{}')$$, '42501', null,
  'S8: forjar payment_events negado');
select throws_ok($$select public.fulfill_order('60000000-0000-0000-0000-0000000000c1', 'pix_char_c1', 4990, null)$$, '42501', null,
  'S8: chamar fulfill_order diretamente negado');
select throws_ok($$select public.refund_order('60000000-0000-0000-0000-00000000000b', null)$$, '42501', null,
  'S8: chamar refund_order diretamente negado');

-- progresso sem acesso
select throws_ok($$insert into public.lesson_progress (lesson_id, completed_at) values ('40000000-0000-0000-0000-000000000002', now())$$,
  '42501', null, 'caio: progresso em aula paga sem acesso negado');
select throws_ok($$insert into public.lesson_progress (lesson_id) values ('40000000-0000-0000-0000-000000000006')$$,
  '42501', null, 'caio: progresso em aula do rascunho atribuído negado');

-- escrita de conteúdo
select throws_ok($$insert into public.courses (slug, title) values ('hack', 'x')$$, '42501', null, 'caio: INSERT courses negado');
select is(pg_temp.affected($$update public.courses set price_cents = 1$$), 0::bigint, 'caio: UPDATE de preço afeta 0 linhas');
select is(pg_temp.affected($$delete from public.courses$$), 0::bigint, 'caio: DELETE courses afeta 0 linhas');
select is(pg_temp.affected($$delete from public.lesson_materials$$), 0::bigint, 'caio: DELETE materiais afeta 0 linhas');
select is(pg_temp.affected($$update public.lessons set is_preview = true$$), 0::bigint, 'caio: tornar aulas preview afeta 0 linhas');
select throws_ok($$insert into public.lesson_materials (lesson_id, type, position, body) values ('40000000-0000-0000-0000-000000000001', 'text', 9, 'x')$$,
  '42501', null, 'caio: INSERT lesson_materials negado');
select throws_ok($$insert into public.categories (slug, name, position) values ('x', 'x', 9)$$, '42501', null, 'caio: INSERT categories negado');

-- funções administrativas
select throws_ok($$select * from public.admin_students()$$, '42501', null, 'caio: admin_students negado');
select throws_ok($$select public.admin_record_manual_sale('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 1)$$, '42501', null, 'caio: admin_record_manual_sale para si negado');
select throws_ok($$select public.reorder_modules('20000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001']::uuid[])$$,
  '42501', null, 'caio: reorder_modules negado');
select is(public.request_refund('60000000-0000-0000-0000-00000000000b'), 'not_found', 'caio: request_refund de pedido alheio -> not_found');
select is(public.request_refund('60000000-0000-0000-0000-0000000000c1'), 'not_paid', 'caio: request_refund de pedido cancelado próprio -> not_paid');

select * from finish();
rollback;
