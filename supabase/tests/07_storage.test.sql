-- 07 — Storage: buckets e policies (course-covers, course-content)
-- Gerado a partir de fixtures determinísticas; roda inteiro em uma transação e desfaz tudo.
-- Papéis simulados como o PostgREST: `set local role` + `request.jwt.claims`.
--   A admin · B aluno com compra · C aluno sem acesso (admin_grant em curso RASCUNHO)
--   D reembolsado · E admin_grant em curso ARQUIVADO · F compra há 8 dias · M tentou virar admin
--   P1 publicado (aula L1 preview) · P2 arquivado · P3 rascunho
begin;
select plan(25);

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

-- Buckets
select is((select public from storage.buckets where id = 'course-covers'), true, 'course-covers é público');
select is((select file_size_limit from storage.buckets where id = 'course-covers'), 5242880::bigint, 'course-covers: limite de 5 MB');
select is((select allowed_mime_types from storage.buckets where id = 'course-covers'),
  array['image/jpeg','image/png','image/webp','image/avif'], 'course-covers: só imagens raster (sem svg)');
select is((select public from storage.buckets where id = 'course-content'), false, 'course-content é privado');
select is((select file_size_limit from storage.buckets where id = 'course-content'), 209715200::bigint, 'course-content: limite de 200 MB');
select ok(
  not exists (select 1 from storage.buckets b, unnest(b.allowed_mime_types) m
              where b.id in ('course-covers', 'course-content')
                and (m in ('text/html', 'image/svg+xml', 'application/javascript', 'text/javascript', 'application/xhtml+xml', 'application/x-httpd-php')
                     or m like '%*%' or m in ('image/*', 'text/*', 'application/*'))),
  'nenhum bucket aceita HTML/SVG/JS (XSS na origem do Storage) nem curingas');
select ok(
  (select allowed_mime_types @> array['application/zip', 'image/png', 'audio/mpeg', 'application/octet-stream'] from storage.buckets where id = 'course-content'),
  'course-content aceita zip, imagens, áudio e binários de projeto');

-- Policies (catálogo)
select is(
  (select array_agg(policyname::text order by policyname) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'course\_storage\_%'),
  array['course_storage_delete_admin','course_storage_insert_admin','course_storage_select_admin','course_storage_update_admin'],
  'storage.objects: exatamente as 4 policies admin do curso');

-- Objetos (como dono) e um bucket alheio ao curso
insert into storage.buckets (id, name) values ('outro-bucket', 'outro-bucket');
insert into storage.objects (bucket_id, name, owner_id) values
  ('course-covers', 'p1/capa.webp', null),
  ('course-content', 'p1/l2/a-projeto.zip', null);

-- Anon
reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'course-content'), 0::bigint, 'anon: não lista course-content');
select is((select count(*) from storage.objects where bucket_id = 'course-covers'), 0::bigint,
  'anon: não lista o bucket de capas pela API (a URL pública do bucket serve o arquivo sem RLS)');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('course-covers', 'x/hack.webp')$$, '42501', null, 'anon: upload em course-covers negado');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('course-content', 'x/hack.zip')$$, '42501', null, 'anon: upload em course-content negado');

-- Aluno COM acesso ao curso (Bia): nem ele lê direto; o download é só por signed URL do servidor.
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select ok(public.has_course_access('20000000-0000-0000-0000-000000000001'), 'aluno (pré-condição): tem acesso ao curso P1');
select is((select count(*) from storage.objects), 0::bigint, 'aluno: não lista nenhum objeto (nem covers, nem content)');
select is((select count(*) from storage.objects where bucket_id = 'course-content' and name = 'p1/l2/a-projeto.zip'), 0::bigint,
  'aluno: não baixa/consulta course-content direto pelo nome do arquivo');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('course-content', 'x/hack.zip', 'x')$$, '42501', null, 'aluno: upload em course-content negado');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('course-covers', 'x/hack.webp', 'x')$$, '42501', null, 'aluno: upload em course-covers negado');
select is(pg_temp.affected($$update storage.objects set name = 'x/roubado.zip' where bucket_id = 'course-content'$$), 0::bigint, 'aluno: renomear/mover objeto afeta 0 linhas');
-- O Storage protege DELETE direto (storage.protect_delete); este GUC é o que o próprio Storage API usa.
set local storage.allow_delete_query = 'true';
select is(pg_temp.affected($$delete from storage.objects where bucket_id in ('course-content', 'course-covers')$$), 0::bigint, 'aluno: remover objeto afeta 0 linhas');

-- Admin
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id in ('course-content', 'course-covers')), 2::bigint, 'admin: lista os dois buckets');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('course-content', 'p1/l3/novo.zip', null)$$, 'admin: upload em course-content');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('course-covers', 'p1/nova.webp', null)$$, 'admin: upload em course-covers');
select is(pg_temp.affected($$update storage.objects set name = 'p1/l3/renomeado.zip' where name = 'p1/l3/novo.zip'$$), 1::bigint, 'admin: atualiza objeto');
set local storage.allow_delete_query = 'true';
select is(pg_temp.affected($$delete from storage.objects where name in ('p1/l3/renomeado.zip', 'p1/nova.webp')$$), 2::bigint, 'admin: remove objetos');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('outro-bucket', 'x')$$, '42501', null,
  'admin: as policies valem só para os 2 buckets do curso (outro bucket negado)');

select * from finish();
rollback;
