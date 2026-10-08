-- 04 — Aluno COM acesso (Bia), acesso revogado (Davi), arquivado (Eva), janela de reembolso (Fabi)
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(39);

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

-- Segundo pedido pago do mesmo curso pela Bia (pagamento em duplicidade) para o antiabuso de reembolso.
insert into public.orders (id, user_id, course_id, amount_cents, provider_billing_id) values
  ('60000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_b2');
do $$ begin perform public.fulfill_order('60000000-0000-0000-0000-0000000000b2', 'pix_char_b2', 4990, null); end $$;

-- Bia (compra ativa em P1)
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select ok(public.has_course_access('20000000-0000-0000-0000-000000000001'), 'bia: has_course_access(P1) = true');
select ok(not public.has_course_access('20000000-0000-0000-0000-000000000003'), 'bia: has_course_access(rascunho) = false');
select is((select count(*) from public.lesson_materials where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 4::bigint, 'bia: lê os 4 materiais de P1 (preview + pagos)');
select is((select count(*) from public.lesson_materials where id = '50000000-0000-0000-0000-000000000005'), 0::bigint,
  'bia: material do curso arquivado (sem matrícula) invisível');
select is((select string_agg(slug, ',') from public.courses where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 'godot-do-zero', 'bia: não vê arquivado nem rascunho');
select lives_ok($$insert into public.lesson_progress (lesson_id, completed_at, last_position_seconds) values ('40000000-0000-0000-0000-000000000002', now(), 600)$$,
  'bia: grava progresso (user_id por default, course_id por trigger)');
select lives_ok($$insert into public.lesson_progress (user_id, lesson_id, last_position_seconds) values ('00000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000003', 10)
  on conflict (user_id, lesson_id) do update set user_id = excluded.user_id, lesson_id = excluded.lesson_id, last_position_seconds = excluded.last_position_seconds$$,
  'bia: upsert de progresso (estilo PostgREST) cria');
select lives_ok($$insert into public.lesson_progress (user_id, lesson_id, last_position_seconds) values ('00000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000003', 42)
  on conflict (user_id, lesson_id) do update set user_id = excluded.user_id, lesson_id = excluded.lesson_id, last_position_seconds = excluded.last_position_seconds$$,
  'bia: upsert de progresso (conflito -> UPDATE)');
select is((select last_position_seconds from public.lesson_progress where lesson_id = '40000000-0000-0000-0000-000000000003'), 42,
  'bia: upsert atualizou a posição');
select throws_ok($$insert into public.lesson_progress (user_id, lesson_id) values ('00000000-0000-0000-0000-00000000000c', '40000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'bia: gravar progresso em nome de outro aluno negado');
select throws_ok($$insert into public.lesson_progress (lesson_id) values ('40000000-0000-0000-0000-000000000005')$$,
  '42501', null, 'bia: progresso em curso arquivado sem matrícula negado');
select throws_ok($$update public.lesson_progress set user_id = '00000000-0000-0000-0000-00000000000c' where lesson_id = '40000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'bia: transferir progresso para outro aluno via UPDATE negado');
select throws_ok($$update public.lesson_progress set updated_at = now() - interval '1 year'$$, '42501', null,
  'bia: updated_at do progresso sem grant de coluna');
select is(
  (select slug || '|' || sources::text || '|' || has_purchase || '|' || lesson_count || '|' || completed_count || '|' || progress_percent || '|' || is_completed
   from public.my_library),
  'godot-do-zero|{purchase}|true|4|1|25|false',
  'bia: my_library = 1 curso, origem purchase, 25% concluído');
-- (os dois progressos são gravados na mesma transação do teste, então "último acesso" empata; em produção cada gravação é uma transação)
select ok((select last_lesson_id in ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003') from public.my_library),
  'bia: my_library aponta "continuar" para uma aula com progresso');
select is((select count(*) from public.orders), 2::bigint, 'bia: vê os próprios 2 pedidos');
select is(public.request_refund('60000000-0000-0000-0000-00000000000b'), 'requested', 'bia: request_refund do 1º pedido -> requested');
select is(public.request_refund('60000000-0000-0000-0000-00000000000b'), 'already_requested', 'bia: pedido de reembolso repetido -> already_requested');
select is((select refund_requested_progress::int from public.orders where id = '60000000-0000-0000-0000-00000000000b'), 25,
  'bia: % do curso consumido registrado no pedido (25)');
select is(public.request_refund('60000000-0000-0000-0000-0000000000b2'), 'previously_refunded',
  'bia: 2º pedido do mesmo curso após pedir reembolso -> previously_refunded (antiabuso)');
select ok(public.has_course_access('20000000-0000-0000-0000-000000000001'), 'bia: o acesso continua até o reembolso ser confirmado pelo provedor');

-- Davi (compra reembolsada)
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
set local role authenticated;
select ok(not public.has_course_access('20000000-0000-0000-0000-000000000001'), 'davi: acesso revogado após o reembolso');
select is((select string_agg(id::text, ',') from public.lesson_materials where course_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), '50000000-0000-0000-0000-000000000001',
  'davi: só o material preview (acesso revogado)');
select is((select count(*) from public.my_library), 0::bigint, 'davi: my_library vazia');
select is((select count(*) from public.enrollments where revoked_at is not null), 1::bigint,
  'davi: a matrícula revogada continua visível no histórico (não foi apagada)');
select is(public.request_refund('60000000-0000-0000-0000-00000000000d'), 'already_refunded', 'davi: request_refund de pedido reembolsado -> already_refunded');
select throws_ok($$insert into public.lesson_progress (lesson_id) values ('40000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'davi: sem acesso, não grava progresso');

reset role;
set local request.jwt.claims = '{"role":"service_role"}';
set local role service_role;
insert into public.orders (id, user_id, course_id, amount_cents, provider_billing_id) values
  ('60000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001', 4990, 'pix_char_d2');
select is(public.fulfill_order('60000000-0000-0000-0000-0000000000d2', 'pix_char_d2', 4990, null), 'fulfilled', 'davi recompra: fulfill_order -> fulfilled');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
set local role authenticated;
select ok(public.has_course_access('20000000-0000-0000-0000-000000000001'), 'davi: a recompra devolve o acesso');
select is(public.request_refund('60000000-0000-0000-0000-0000000000d2'), 'previously_refunded',
  'davi: reembolso após recompra -> previously_refunded (ADR-017)');

-- Eva (admin_grant em curso arquivado)
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
set local role authenticated;
select is((select string_agg(slug, ',' order by slug) from public.courses where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 'curso-antigo,godot-do-zero',
  'eva: vê o curso arquivado (tem acesso) e o publicado');
select is((select count(*) from public.lesson_materials where course_id = '20000000-0000-0000-0000-000000000002'), 1::bigint, 'eva: lê o material do curso arquivado');
select is((select count(*) from public.course_catalog where id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')), 1::bigint, 'eva: course_catalog não lista arquivado');
select is((select count(*) from public.course_outline where course_id = '20000000-0000-0000-0000-000000000002'), 1::bigint, 'eva: course_outline inclui o arquivado com acesso');
select lives_ok($$insert into public.lesson_progress (lesson_id, completed_at) values ('40000000-0000-0000-0000-000000000005', now())$$,
  'eva: grava progresso no curso arquivado');
select is(
  (select slug || '|' || course_status || '|' || sources::text || '|' || progress_percent || '|' || is_completed from public.my_library),
  'curso-antigo|archived|{admin_grant}|100|true', 'eva: my_library mostra o arquivado, origem admin_grant, 100%');
select is(public.request_refund('60000000-0000-0000-0000-00000000000b'), 'not_found', 'eva: request_refund de pedido alheio -> not_found');

-- Fabi (pagou há 8 dias): fora da janela de 7 dias
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
set local role authenticated;
select is(public.request_refund('60000000-0000-0000-0000-00000000000f'), 'window_expired', 'fabi: reembolso após 7 dias -> window_expired');
reset role;
reset request.jwt.claims;
update public.orders set paid_at = now() - interval '6 days 23 hours' where id = '60000000-0000-0000-0000-00000000000f';
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
set local role authenticated;
select is(public.request_refund('60000000-0000-0000-0000-00000000000f'), 'requested', 'fabi: dentro de 7 dias -> requested');

select * from finish();
rollback;
