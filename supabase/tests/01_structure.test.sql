-- 01 — Estrutura de segurança (RLS, grants, funções, views)
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(17);

-- Sem fixtures: só inspeciona o catálogo. Funções de extensões (ex.: pgTAP, se instalada em public) são ignoradas.

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  11::bigint, 'public tem as 11 tabelas do MVP (nova tabela exige revisar este teste e a RLS)');

select ok(
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  'toda tabela de public tem RLS habilitada');

select ok(
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r'
                and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)),
  'toda tabela de public tem ao menos 1 policy');

select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and 'public' = any (roles)),
  'nenhuma policy de public usa o papel PUBLIC (sempre anon/authenticated explícitos)');

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosecdef
                and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
                and not coalesce(p.proconfig @> array['search_path=""'], false)),
  'toda função SECURITY DEFINER de public tem search_path vazio');

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v' and c.reloptions @> array['security_invoker=true']),
  3::bigint, 'as 3 views de public são security_invoker');

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('v', 'm')),
  3::bigint, 'não há outras views/materialized views em public');

select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
  array['has_course_access'],
  'anon só executa has_course_access (is_admin, fulfill_order, admin_* e triggers: não)');

select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
  array['admin_course_students','admin_dashboard_metrics','admin_record_manual_sale','admin_revenue_by_day','admin_student_by_id','admin_students','admin_top_courses','has_course_access','is_admin','reorder_lessons','reorder_materials','reorder_modules','request_refund'],
  'authenticated executa só as funções de app (nunca fulfill_order/refund_order nem triggers)');

select ok(
  has_function_privilege('service_role', 'public.fulfill_order(uuid,text,integer,text)', 'execute')
  and has_function_privilege('service_role', 'public.refund_order(uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.fulfill_order(uuid,text,integer,text)', 'execute')
  and not has_function_privilege('anon', 'public.refund_order(uuid,text)', 'execute'),
  'fulfill_order/refund_order: só service_role executa');

select is(
  (select array_agg(distinct table_name::text || ':' || privilege_type order by table_name::text || ':' || privilege_type)
   from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  array['categories:SELECT','course_catalog:SELECT','course_modules:SELECT','course_outline:SELECT','courses:SELECT','lesson_materials:SELECT','lessons:SELECT'],
  'anon: apenas SELECT em conteúdo público e nas views de catálogo/ementa');

select ok(
  not exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and grantee = 'authenticated'
                and table_name in ('profiles','user_roles','enrollments','orders','payment_events')
                and privilege_type <> 'SELECT'
                and privilege_type <> 'UPDATE' and privilege_type <> 'INSERT'),
  'authenticated: sem DELETE/TRUNCATE/etc. em profiles, user_roles, enrollments, orders, payment_events');

select ok(
  not exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and grantee = 'authenticated'
                and table_name in ('user_roles','orders','payment_events')
                and privilege_type <> 'SELECT'),
  'authenticated: user_roles, orders e payment_events são somente leitura (sem nenhuma escrita)');

select ok(
  not exists (select 1 from information_schema.table_privileges
              where table_schema = 'public' and grantee = 'authenticated' and table_name = 'enrollments'
                and privilege_type in ('DELETE', 'TRUNCATE')),
  'enrollments nunca é apagada (histórico permanente)');

select ok(
  has_table_privilege('service_role', 'public.orders', 'select, insert, update'),
  'service_role mantém privilégios de tabela (webhook/checkout)');

select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage.objects tem RLS habilitada');

select ok(
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
              and policyname like 'course\_storage\_%' and not (roles = array['authenticated']::name[])),
  'policies de storage do curso existem só para authenticated (nenhuma para anon)');

select * from finish();
rollback;
