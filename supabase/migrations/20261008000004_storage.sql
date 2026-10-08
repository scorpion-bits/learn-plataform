-- =============================================================================
-- DB-004 — Storage: buckets e policies
-- =============================================================================
-- docs/database.md §6, ADR-009 (conteúdo pago só por signed URL do servidor),
-- ADR-020 (sem PDF).
--
--   course-covers  público, 5 MB, só imagens raster (jpeg/png/webp/avif).
--                  Leitura pelo endpoint público do bucket (não passa por RLS).
--                  Escrita: admin.
--   course-content privado, 200 MB. NINGUÉM lê pelo client (nem aluno com
--                  acesso): o servidor checa o acesso (RLS de lesson_materials)
--                  e gera signed URL curta com o service role.
--                  Escrita: admin.
--
-- Conteúdo ativo (text/html, image/svg+xml, javascript) NÃO é aceito em nenhum
-- bucket: o Storage serve o objeto com o content-type declarado no upload, e
-- HTML/SVG/JS na origem do Storage seriam XSS (audit S5). O Supabase só aceita
-- lista de PERMITIDOS (allowed_mime_types), então listamos explicitamente os
-- tipos (sem curingas como image/* ou text/*, que incluiriam svg/html).
-- Arquivos binários de engine/arte sem MIME próprio (.blend, .aseprite,
-- .unitypackage, .godot…) chegam como application/octet-stream.
--
-- Policies usam (select public.is_admin()), que só existe para authenticated.
-- Nenhuma policy é criada para anon (nem leitura): o bucket público serve as
-- capas por URL sem RLS, e uma policy de SELECT só acrescentaria LISTAGEM do
-- bucket (enumeraria capas de cursos em rascunho).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'course-covers', 'course-covers', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'course-content', 'course-content', false, 209715200,
    array[
      -- arquivos compactados / projetos
      'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed',
      'application/vnd.rar', 'application/x-rar-compressed', 'application/x-tar',
      'application/gzip', 'application/x-gzip',
      -- binários genéricos (assets de engine/arte), dados e texto simples
      'application/octet-stream', 'application/json',
      'text/plain', 'text/markdown', 'text/csv',
      -- imagens raster (sem svg)
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
      -- áudio e vídeo
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/flac',
      'video/mp4', 'video/webm',
      -- fontes e modelos 3D
      'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
      'model/gltf-binary', 'model/gltf+json', 'model/obj'
    ]
  )
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Policies em storage.objects (RLS já é habilitada pelo Supabase)
-- -----------------------------------------------------------------------------

-- Admin lê/lista os dois buckets (necessário para upsert e para o painel).
create policy course_storage_select_admin on storage.objects
  for select to authenticated
  using (
    bucket_id in ('course-covers', 'course-content')
    and (select public.is_admin())
  );

create policy course_storage_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('course-covers', 'course-content')
    and (select public.is_admin())
  );

create policy course_storage_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id in ('course-covers', 'course-content')
    and (select public.is_admin())
  )
  with check (
    bucket_id in ('course-covers', 'course-content')
    and (select public.is_admin())
  );

create policy course_storage_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('course-covers', 'course-content')
    and (select public.is_admin())
  );

-- Intencionalmente NÃO existe:
--   * policy para anon em storage.objects;
--   * SELECT em course-content para alunos (mesmo com has_course_access):
--     o download é sempre signed URL (<= 600 s) criada no servidor depois de
--     ler o material com o client do usuário (src/features/materials/storage.ts).
