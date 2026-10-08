-- 06 — fulfill_order, refund_order e request_refund (service role)
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(30);

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
  ('60000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_c1', now() + interval '1 hour');
insert into public.payment_events (provider_event_id, event_type, payload) values
  ('evt_b_paid', 'transparent.completed', '{}'),
  ('evt_b_paid_bad_amount', 'transparent.completed', '{}'),
  ('evt_d_paid', 'transparent.completed', '{}'),
  ('evt_d_refund', 'transparent.refunded', '{}'),
  ('evt_b2', 'transparent.completed', '{}');

-- Linhas afetadas por um DML executado com o papel corrente.
create function pg_temp.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function pg_temp.affected(text) to public;

reset role;
set local request.jwt.claims = '{"role":"service_role"}';
set local role service_role;
select is(public.fulfill_order('60000000-0000-0000-0000-00000000000b', 'pix_char_b', 1, 'evt_b_paid_bad_amount'), 'amount_mismatch', 'fulfill: valor divergente não paga');
select is(public.fulfill_order('60000000-0000-0000-0000-00000000000b', 'pix_char_OUTRO', 4990, null), 'billing_mismatch', 'fulfill: billing id divergente não paga');
select is(public.fulfill_order(gen_random_uuid(), 'x', 1, null), 'order_not_found', 'fulfill: pedido inexistente');
select is((select processed_at is null and processing_error = 'fulfill_order: amount_mismatch' from public.payment_events where provider_event_id = 'evt_b_paid_bad_amount'),
  true, 'fulfill: evento com erro registra processing_error e fica não processado');
select is((select status::text from public.orders where id = '60000000-0000-0000-0000-00000000000b'), 'pending', 'fulfill: pedido continua pending após as falhas');
select is((select count(*) from public.enrollments where order_id = '60000000-0000-0000-0000-00000000000b'), 0::bigint, 'fulfill: falhas não criam matrícula');
select is(public.fulfill_order('60000000-0000-0000-0000-00000000000b', 'pix_char_b', 4990, 'evt_b_paid'), 'fulfilled', 'fulfill: pagamento válido -> fulfilled');
select is(public.fulfill_order('60000000-0000-0000-0000-00000000000b', 'pix_char_b', 4990, 'evt_b_paid'), 'already_paid', 'fulfill: reentrega -> already_paid (idempotente)');
select is(
  (select count(*) from public.enrollments where order_id = '60000000-0000-0000-0000-00000000000b' and source = 'purchase' and revoked_at is null), 1::bigint,
  'fulfill: exatamente 1 matrícula purchase ativa após reentrega');
select is((select status::text || '|' || (paid_at is not null) from public.orders where id = '60000000-0000-0000-0000-00000000000b'), 'paid|true',
  'fulfill: pedido paid com paid_at');
select is((select processed_at is not null and processing_error is null and order_id = '60000000-0000-0000-0000-00000000000b'
           from public.payment_events where provider_event_id = 'evt_b_paid'), true, 'fulfill: evento marcado como processado e ligado ao pedido');

-- Pedido expirado localmente e pago depois no provedor
update public.orders set status = 'expired' where id = '60000000-0000-0000-0000-00000000000d';
select is(public.fulfill_order('60000000-0000-0000-0000-00000000000d', 'pix_char_d', 4990, 'evt_d_paid'), 'fulfilled', 'fulfill: expired -> paid aceito');

-- Reembolso
select is(public.refund_order('60000000-0000-0000-0000-0000000000c1', null), 'invalid_status', 'refund: pedido pending -> invalid_status');
select is(public.refund_order(gen_random_uuid(), null), 'order_not_found', 'refund: pedido inexistente');
select is(public.refund_order('60000000-0000-0000-0000-00000000000d', 'evt_d_refund'), 'refunded', 'refund: paid -> refunded');
select is(public.refund_order('60000000-0000-0000-0000-00000000000d', 'evt_d_refund'), 'already_refunded', 'refund: reentrega -> already_refunded');
select is(
  (select revoked_at is not null and revoke_reason = 'refund' and revoked_by is null from public.enrollments where order_id = '60000000-0000-0000-0000-00000000000d'),
  true, 'refund: matrícula do pedido revogada (reason refund, revoked_by nulo)');
select is((select status::text || '|' || (refunded_at is not null) from public.orders where id = '60000000-0000-0000-0000-00000000000d'), 'refunded|true',
  'refund: pedido refunded com refunded_at');

update public.orders set status = 'canceled' where id = '60000000-0000-0000-0000-0000000000c1';
select is(public.fulfill_order('60000000-0000-0000-0000-0000000000c1', 'pix_char_c1', 4990, null), 'invalid_status', 'fulfill: pedido canceled -> invalid_status (tratamento manual)');

-- Pedido marcado failed (timeout ao criar a cobrança no PAY-002, sem billing id gravado),
-- mas a cobrança existia e foi paga: o provedor confirmou -> failed -> paid (migration 0007).
insert into public.orders (id, user_id, course_id, amount_cents, status, expires_at) values
  ('60000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 4990, 'failed', now() - interval '1 hour');
insert into public.payment_events (provider_event_id, event_type, payload) values ('evt_e1_paid', 'transparent.completed', '{}');
select is(public.fulfill_order('60000000-0000-0000-0000-0000000000e1', 'pix_char_e1', 1, null), 'amount_mismatch', 'fulfill: failed com valor divergente não paga');
select is(public.fulfill_order('60000000-0000-0000-0000-0000000000e1', 'pix_char_e1', 4990, 'evt_e1_paid'), 'fulfilled', 'fulfill: failed -> paid aceito (cobrança paga após timeout)');
select is(
  (select o.status::text || '|' || o.provider_billing_id || '|' || (o.paid_at is not null) from public.orders o where o.id = '60000000-0000-0000-0000-0000000000e1')
  || '|' || (select count(*) from public.enrollments where order_id = '60000000-0000-0000-0000-0000000000e1' and source = 'purchase' and revoked_at is null),
  'paid|pix_char_e1|true|1', 'fulfill: failed -> paid grava billing id, paid_at e cria matrícula');

-- Pagamento em duplicidade (a Bia gera um 2º pedido do mesmo curso, que também é pago no provedor)
insert into public.orders (id, user_id, course_id, amount_cents, provider_billing_id, expires_at) values
  ('60000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_b2', now() + interval '1 hour');
select is(public.fulfill_order('60000000-0000-0000-0000-0000000000b2', 'pix_char_b2', 4990, 'evt_b2'), 'paid_already_enrolled',
  'fulfill: 2º pedido pago com matrícula ativa -> paid_already_enrolled');
select is(
  (select status::text from public.orders where id = '60000000-0000-0000-0000-0000000000b2')
  || '|' || (select count(*) from public.enrollments where order_id = '60000000-0000-0000-0000-0000000000b2'),
  'paid|0', 'duplicidade: pedido pago, sem 2ª matrícula');
select is((select processed_at is not null and processing_error is not null from public.payment_events where provider_event_id = 'evt_b2'), true,
  'duplicidade: evento processado com alerta para reembolso manual');

-- Dedupe de eventos
select throws_ok($$insert into public.payment_events (provider_event_id, event_type, payload) values ('evt_b2', 'x', '{}')$$, '23505', null,
  'payment_events: provider_event_id duplicado rejeitado (dedupe de webhook)');

-- Outros papéis não executam
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.fulfill_order('60000000-0000-0000-0000-0000000000b2', 'pix_char_b2', 4990, null)$$, '42501', null, 'admin autenticado não chama fulfill_order');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.fulfill_order('60000000-0000-0000-0000-0000000000b2', 'pix_char_b2', 4990, null)$$, '42501', null, 'aluno não chama fulfill_order');
select throws_ok($$select public.refund_order('60000000-0000-0000-0000-00000000000b', null)$$, '42501', null, 'aluno não chama refund_order');
reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select throws_ok($$select public.fulfill_order('60000000-0000-0000-0000-0000000000b2', 'pix_char_b2', 4990, null)$$, '42501', null, 'anon não chama fulfill_order');

select * from finish();
rollback;
