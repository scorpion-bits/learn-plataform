-- 08 — Métricas do admin (DB-006): admin_dashboard_metrics, admin_revenue_by_day, admin_top_courses
-- Transação única, desfeita ao final. Pressupõe banco de teste limpo (como os demais testes).
-- Janela: [2026-03-01 00:00 -03, 2026-03-11 00:00 -03) = 10 dias em America/Sao_Paulo.
--   A admin · B, C, D, E alunos · P1 (4990) · P2 (2000)
--   o1 B/P1 paga 02/03 (com pedido de reembolso)      +4990
--   o2 C/P1 paga 02/03, reembolsada 05/03             +4990 / -4990
--   o3 D/P2 venda MANUAL 05/03                        +2000
--   o4 E/P2 pendente (não conta)
--   o5 B/P2 paga em fev, reembolsada 03/03 (só estorno) -3000
--   o6 D/P1 paga 10/03 23:00 -03 (= 11/03 02:00Z, dentro)  +4990
--   o7 E/P1 paga exatamente em p_to (fora, intervalo exclusivo)
--   o9 E/P2 paga 28/02 23:00 -03 (= 01/03 02:00Z, fora, antes)
begin;
select plan(45);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@test', '{"full_name":"Bia"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@test', '{"full_name":"Caio"}'),
  ('00000000-0000-0000-0000-00000000000d', 'davi@test', '{"full_name":"Davi"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eva@test', '{"full_name":"Eva"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');
update public.profiles set created_at = '2026-03-02 12:00-03' where id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');
update public.profiles set created_at = '2026-02-01 12:00-03' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set created_at = '2026-03-10 12:00-03' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.courses (id, slug, title, price_cents, status) values
  ('20000000-0000-0000-0000-000000000001', 'p1', 'Curso Um', 4990, 'published'),
  ('20000000-0000-0000-0000-000000000002', 'p2', 'Curso Dois', 2000, 'published');

-- Pedidos já pagos (inseridos pelo dono do schema; em produção só fulfill_order faz isso).
insert into public.orders (id, user_id, course_id, amount_cents, status, provider_billing_id, paid_at, refund_requested_at) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_1', '2026-03-02 12:00-03', '2026-03-03 10:00-03'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_2', '2026-03-02 15:00-03', null),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_6', '2026-03-11 02:00Z', null),
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 4990, 'paid', 'pix_7', '2026-03-11 03:00Z', null),
  ('60000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000002', 1000, 'paid', 'pix_9', '2026-03-01 02:00Z', null),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000002', 3000, 'paid', 'pix_5', '2026-02-20 12:00-03', null);
insert into public.orders (id, user_id, course_id, amount_cents, status, provider, source, created_by, paid_at) values
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000002', 2000, 'paid', 'manual', 'manual', '00000000-0000-0000-0000-00000000000a', '2026-03-05 09:00-03');
insert into public.orders (id, user_id, course_id, amount_cents, status, provider_billing_id, expires_at) values
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000002', 2000, 'pending', 'pix_4', now() + interval '1 hour');

-- Matrículas (granted_at fixado dentro/fora da janela)
insert into public.enrollments (user_id, course_id, source, order_id, granted_at) values
  ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-000000000001', '2026-03-02 12:00-03'),
  ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-000000000002', '2026-03-02 15:00-03'),
  ('00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001', 'purchase', '60000000-0000-0000-0000-000000000006', '2026-03-10 23:00-03'),
  ('00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000002', 'purchase', '60000000-0000-0000-0000-000000000003', '2026-03-05 09:00-03');
insert into public.enrollments (user_id, course_id, source, granted_by, granted_at) values
  ('00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 'admin_grant', '00000000-0000-0000-0000-00000000000a', '2026-03-04 10:00-03'),
  ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000002', 'admin_grant', '00000000-0000-0000-0000-00000000000a', '2026-02-01 10:00-03');

-- Reembolsos (depois das matrículas: o guard exige pedido paid ao matricular)
update public.orders set status = 'refunded', refunded_at = '2026-03-05 10:00-03' where id = '60000000-0000-0000-0000-000000000002';
update public.orders set status = 'refunded', refunded_at = '2026-03-03 10:00-03' where id = '60000000-0000-0000-0000-000000000005';
update public.enrollments set revoked_at = '2026-03-05 10:00-03', revoke_reason = 'refund'
 where order_id = '60000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- anon e aluno: 42501
-- ---------------------------------------------------------------------------
reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from public.admin_dashboard_metrics('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'anon: admin_dashboard_metrics negado');
select throws_ok($$select * from public.admin_revenue_by_day('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'anon: admin_revenue_by_day negado');
select throws_ok($$select * from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'anon: admin_top_courses negado');

reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select * from public.admin_dashboard_metrics('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'aluno: admin_dashboard_metrics negado');
select throws_ok($$select * from public.admin_revenue_by_day('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'aluno: admin_revenue_by_day negado');
select throws_ok($$select * from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03')$$, '42501', null, 'aluno: admin_top_courses negado');
select throws_ok($$select public.admin_metrics_check_range('2026-03-01', '2026-03-02')$$, '42501', null, 'aluno: helper interno não é chamável');

-- ---------------------------------------------------------------------------
-- admin: valores
-- ---------------------------------------------------------------------------
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

create temp table m as select * from public.admin_dashboard_metrics('2026-03-01 00:00-03', '2026-03-11 00:00-03');
grant select on m to authenticated;
select is((select count(*) from m), 1::bigint, 'metrics: uma linha');
select is((select revenue_cents from m), 8980::bigint, 'metrics: receita = vendas 16970 - estornos 7990');
select is((select sales_count from m), 4::bigint, 'metrics: vendas (pagas+reembolsadas no período; pendente/fora excluídos; manual incluída)');
select is((select avg_ticket_cents from m), 4243::bigint, 'metrics: ticket médio = 16970/4 arredondado');
select is((select students_total from m), 4::bigint, 'metrics: alunos totais (admin não conta)');
select is((select students_new from m), 3::bigint, 'metrics: alunos novos no período');
select is((select enrollments_purchase from m), 3::bigint, 'metrics: matrículas de compra ativas no período (reembolsada sai)');
select is((select enrollments_admin_grant from m), 1::bigint, 'metrics: matrículas admin_grant no período');
select is((select refunds_count from m), 2::bigint, 'metrics: estornos no período');
select is((select pending_refund_requests from m), 1::bigint, 'metrics: pedidos de reembolso pendentes');

select is((select revenue_cents from public.admin_dashboard_metrics('2026-04-01 00:00-03', '2026-04-08 00:00-03')), 0::bigint, 'metrics: período vazio -> receita 0');
select is((select avg_ticket_cents from public.admin_dashboard_metrics('2026-04-01 00:00-03', '2026-04-08 00:00-03')), 0::bigint, 'metrics: período vazio -> ticket 0 (sem divisão por zero)');

-- por dia
create temp table d as select * from public.admin_revenue_by_day('2026-03-01 00:00-03', '2026-03-11 00:00-03');
grant select on d to authenticated;
select is((select count(*) from d), 10::bigint, 'by_day: 10 dias, vazios preenchidos');
select is((select min(day) from d), '2026-03-01'::date, 'by_day: começa em 01/03');
select is((select max(day) from d), '2026-03-10'::date, 'by_day: termina em 10/03 (p_to exclusivo)');
select is((select sum(revenue_cents)::bigint from d), 8980::bigint, 'by_day: soma dos dias = receita das métricas');
select is((select revenue_cents from d where day = '2026-03-02'), 9980::bigint, 'by_day: 02/03 duas vendas');
select is((select sales from d where day = '2026-03-02'), 2, 'by_day: 02/03 conta 2 vendas');
select is((select revenue_cents from d where day = '2026-03-03'), -3000::bigint, 'by_day: 03/03 só estorno (líquido negativo)');
select is((select revenue_cents from d where day = '2026-03-05'), -2990::bigint, 'by_day: 05/03 venda manual - estorno');
select is((select revenue_cents from d where day = '2026-03-10'), 4990::bigint, 'by_day: 10/03 23:00 -03 cai em 10/03 (fuso SP, não UTC)');
select is((select revenue_cents || '/' || sales from d where day = '2026-03-04'), '0/0', 'by_day: dia vazio = 0/0');

-- top cursos
select is((select count(*) from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03')), 2::bigint, 'top: dois cursos');
select is((select slug from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03') limit 1), 'p1', 'top: ordenado por receita líquida');
select is((select revenue_cents from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03') where slug = 'p1'), 9980::bigint, 'top: p1 receita 9980');
select is((select sales from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03') where slug = 'p1'), 3::bigint, 'top: p1 vendas 3');
select is((select revenue_cents from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03') where slug = 'p2'), -1000::bigint, 'top: p2 receita 2000 - 3000');
select is((select count(*) from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03', 1)), 1::bigint, 'top: p_limit respeitado');
select is((select count(*) from public.admin_top_courses('2026-03-01 00:00-03', '2026-03-11 00:00-03', 0)), 1::bigint, 'top: p_limit < 1 vira 1');

-- ---------------------------------------------------------------------------
-- intervalo inválido (22023)
-- ---------------------------------------------------------------------------
select throws_ok($$select * from public.admin_dashboard_metrics('2026-03-11', '2026-03-01')$$, '22023', null, 'metrics: p_to < p_from');
select throws_ok($$select * from public.admin_dashboard_metrics('2026-03-01', '2026-03-01')$$, '22023', null, 'metrics: p_to = p_from');
select throws_ok($$select * from public.admin_dashboard_metrics('2026-01-01', '2027-01-03')$$, '22023', null, 'metrics: mais de 366 dias');
select throws_ok($$select * from public.admin_dashboard_metrics(null, '2026-03-01')$$, '22023', null, 'metrics: p_from nulo');
select throws_ok($$select * from public.admin_revenue_by_day('2026-03-11', '2026-03-01')$$, '22023', null, 'by_day: p_to < p_from');
select throws_ok($$select * from public.admin_revenue_by_day('2026-01-01', '2027-01-03')$$, '22023', null, 'by_day: mais de 366 dias');
select throws_ok($$select * from public.admin_top_courses('2026-03-11', '2026-03-01')$$, '22023', null, 'top: p_to < p_from');
select throws_ok($$select * from public.admin_top_courses('2026-01-01', '2027-01-03')$$, '22023', null, 'top: mais de 366 dias');
select lives_ok($$select * from public.admin_revenue_by_day('2026-01-01', '2027-01-02')$$, 'by_day: exatamente 366 dias é aceito');

select * from finish();
rollback;
