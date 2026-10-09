-- 11 — anonymize_user: exclusão de conta pelo titular (DB-008)
--   A admin · B aluno com compra paga, atribuição e progresso · C reembolso pendente
--   D PIX em aberto · E pedido PIX expirado (pode excluir) · F aluno não envolvido
begin;
select plan(28);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@test', '{"full_name":"Bia Compradora"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@test', '{"full_name":"Caio"}'),
  ('00000000-0000-0000-0000-00000000000d', 'davi@test', '{"full_name":"Davi"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eva@test', '{"full_name":"Eva"}'),
  ('00000000-0000-0000-0000-00000000000f', 'fabi@test', '{"full_name":"Fabi"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');

update public.profiles
   set tax_id = '11144477735', phone = '11940028922', avatar_url = 'https://cdn.test/bia.png'
 where id = '00000000-0000-0000-0000-00000000000b';

insert into public.courses (id, slug, title, price_cents, status) values
  ('20000000-0000-0000-0000-000000000001', 'godot', 'Godot', 4990, 'published'),
  ('20000000-0000-0000-0000-000000000002', 'unity', 'Unity', 2990, 'published');
insert into public.course_modules (id, course_id, title, position) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'M1', 0);
insert into public.lessons (id, module_id, title, position) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'L1', 0);

-- B: compra paga do curso 1 + atribuição do curso 2 + progresso
insert into public.orders (id, user_id, course_id, amount_cents, status, provider_billing_id, paid_at) values
  ('60000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_char_b1', now());
insert into public.payment_events (provider_event_id, event_type, order_id, payload) values
  ('evt_b1', 'transparent.completed', '60000000-0000-0000-0000-0000000000b1', '{}');
insert into public.enrollments (user_id, course_id, source, order_id) values
  ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-0000000000b1');
insert into public.enrollments (user_id, course_id, source, granted_by) values
  ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000002', 'admin_grant', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000f', '20000000-0000-0000-0000-000000000002', 'admin_grant', '00000000-0000-0000-0000-00000000000a');
insert into public.lesson_progress (user_id, lesson_id, completed_at) values
  ('00000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-00000000000f', '40000000-0000-0000-0000-000000000001', now());

-- C: reembolso solicitado e não concluído
insert into public.orders (user_id, course_id, amount_cents, status, provider_billing_id, paid_at, refund_requested_at) values
  ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_char_c1', now(), now());
-- D: PIX em aberto
insert into public.orders (user_id, course_id, amount_cents, status, provider_billing_id, expires_at) values
  ('00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001', 4990, 'pending', 'pix_char_d1', now() + interval '30 minutes');
-- E: PIX vencido (ainda 'pending' localmente) e pedido sem cobrança criada
insert into public.orders (user_id, course_id, amount_cents, status, provider_billing_id, expires_at) values
  ('00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 4990, 'pending', 'pix_char_e1', now() - interval '1 minute'),
  ('00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000002', 2990, 'pending', null, null);

-- ---------------------------------------------------------------------------
-- Quem executa
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select throws_ok($$select public.anonymize_user('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'anon: anonymize_user negado');

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.anonymize_user('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'aluno: anonymize_user negado (nem a própria conta)');

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.anonymize_user('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'admin: anonymize_user negado');

reset role;
select ok(has_function_privilege('service_role', 'public.anonymize_user(uuid)', 'execute'), 'service_role executa anonymize_user');
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = 'public.anonymize_user(uuid)'::regprocedure),
  'anonymize_user: security definer com search_path vazio');

-- ---------------------------------------------------------------------------
-- service_role anonimiza B
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"role":"service_role"}';
set local role service_role;
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000b'), 'anonymized', 'service_role: B anonimizado');
reset role;

select is(
  (select row(full_name, tax_id, phone, avatar_url)::text from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  row('Conta excluída', null::text, null::text, null::text)::text,
  'B: nome trocado e CPF/telefone/avatar apagados');
select isnt((select deleted_at from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), null, 'B: deleted_at preenchido');
select is(
  (select count(*) from public.enrollments where user_id = '00000000-0000-0000-0000-00000000000b' and revoked_at is null),
  0::bigint, 'B: nenhuma matrícula ativa');
select is(
  (select count(*) from public.enrollments
    where user_id = '00000000-0000-0000-0000-00000000000b' and revoke_reason = 'account_deleted'
      and revoked_by = '00000000-0000-0000-0000-00000000000b'),
  2::bigint, 'B: compra e atribuição revogadas (account_deleted), histórico preservado');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select is(public.has_course_access('20000000-0000-0000-0000-000000000001'), false, 'B: sem acesso ao curso comprado');
reset role;
select is(
  (select count(*) from public.lesson_progress where user_id = '00000000-0000-0000-0000-00000000000b'),
  0::bigint, 'B: progresso apagado');
select is(
  (select status::text || '|' || amount_cents || '|' || user_id from public.orders where id = '60000000-0000-0000-0000-0000000000b1'),
  'paid|4990|00000000-0000-0000-0000-00000000000b', 'B: pedido preservado intacto');
select is(
  (select count(*) from public.payment_events where order_id = '60000000-0000-0000-0000-0000000000b1'),
  1::bigint, 'B: payment_events preservados');
select is(
  (select count(*) from public.enrollments where user_id = '00000000-0000-0000-0000-00000000000f' and revoked_at is null)
  + (select count(*) from public.lesson_progress where user_id = '00000000-0000-0000-0000-00000000000f'),
  2::bigint, 'F (não envolvido): matrícula e progresso intactos');

-- Idempotência
create temp table b_deleted_at on commit drop as
  select deleted_at from public.profiles where id = '00000000-0000-0000-0000-00000000000b';
set local role service_role;
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000b'), 'already_anonymized', 'idempotente: 2ª chamada -> already_anonymized');
reset role;
select is(
  (select deleted_at from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  (select deleted_at from b_deleted_at), 'idempotente: deleted_at original mantido');

-- ---------------------------------------------------------------------------
-- Recusas
-- ---------------------------------------------------------------------------
set local role service_role;
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000a'), 'is_admin', 'admin recusado');
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000c'), 'refund_pending', 'reembolso pendente recusado');
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000d'), 'payment_pending', 'PIX em aberto recusado');
select is(public.anonymize_user('00000000-0000-0000-0000-0000000000ee'), 'not_found', 'id inexistente -> not_found');
select is(public.anonymize_user(null), 'not_found', 'id nulo -> not_found');
select is(public.anonymize_user('00000000-0000-0000-0000-00000000000e'), 'anonymized', 'PIX vencido / pedido sem cobrança não bloqueiam');
reset role;

select is(
  (select string_agg(full_name || ':' || (deleted_at is null)::text, ',' order by id) from public.profiles
    where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')),
  'Admin:true,Caio:true,Davi:true', 'recusas não alteram o perfil');

-- ---------------------------------------------------------------------------
-- Pós-exclusão
-- ---------------------------------------------------------------------------
-- O access token de B ainda válido não consegue regravar dados pessoais.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
update public.profiles set full_name = 'Bia de novo', tax_id = '11144477735' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is(
  (select full_name || ':' || coalesce(tax_id, '-') from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Conta excluída:-', 'aluno não edita perfil excluído (RLS)');

-- Usuário comum continua editando o próprio perfil.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
set local role authenticated;
update public.profiles set full_name = 'Fabi Souza' where id = '00000000-0000-0000-0000-00000000000f';
reset role;
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000f'), 'Fabi Souza', 'perfil ativo segue editável');

-- Painel admin lista o perfil anonimizado sem quebrar.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is(
  (select full_name || '|' || active_enrollments || '|' || total_spent_cents
     from public.admin_students(null, 50, 0) where user_id = '00000000-0000-0000-0000-00000000000b'),
  'Conta excluída|0|4990', 'admin_students: "Conta excluída", sem matrícula ativa, gasto preservado');
select is(
  (select full_name from public.admin_student_by_id('00000000-0000-0000-0000-00000000000b')),
  'Conta excluída', 'admin_student_by_id: "Conta excluída"');
reset role;

select * from finish();
rollback;
