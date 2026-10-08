-- =============================================================================
-- DB-001 — Schema de conteúdo e identidade
-- =============================================================================
-- Materializa docs/database.md §1–3 (parte de conteúdo e identidade):
--   enums app_role / course_level / course_status / material_type,
--   public.set_updated_at(), profiles, user_roles, categories, courses,
--   course_modules, lessons, lesson_materials.
--
-- Segurança: RLS é HABILITADA em todas as tabelas e todos os privilégios de
-- anon/authenticated são revogados. Policies, grants por coluna, is_admin(),
-- has_course_access() e handle_new_user() chegam no DB-003. Até lá as tabelas
-- ficam fechadas para o client (só service role / owner).
--
-- Extensões: nenhuma é necessária. gen_random_uuid() é nativa desde o PG 13.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'student');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');
create type public.course_status as enum ('draft', 'published', 'archived');
-- Sem 'pdf' (decisão do produto: não haverá PDFs na plataforma). Arquivos para
-- download (assets, projetos .zip etc.) usam 'file'.
-- Expansão futura (pós-MVP): 'html_bundle' (ADR-010), 'exercise'.
create type public.material_type as enum ('video', 'text', 'file', 'link');

comment on type public.app_role is
  'Papel do usuário. admin só é concedido via service role/SQL (ADR-005).';
comment on type public.material_type is
  'Tipo de material de aula. Cada tipo exige um conjunto próprio de colunas (lesson_materials_type_fields_check).';

-- -----------------------------------------------------------------------------
-- Funções utilitárias de trigger
-- -----------------------------------------------------------------------------

-- updated_at sempre controlado pelo banco (valor enviado pelo client é ignorado).
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: força updated_at = now().';

-- -----------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  tax_id      text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_full_name_length check (char_length(full_name) <= 120),
  constraint profiles_avatar_url_format check (
    avatar_url is null or (avatar_url ~* '^https://' and char_length(avatar_url) <= 2048)
  ),
  constraint profiles_tax_id_format check (tax_id is null or tax_id ~ '^[0-9]{11}$'),
  constraint profiles_phone_format check (phone is null or phone ~ '^[0-9]{10,15}$')
);

comment on table public.profiles is
  'Dados de perfil do usuário (1:1 com auth.users). Email NÃO é duplicado aqui. Papel NÃO mora aqui (ver user_roles).';
comment on column public.profiles.tax_id is
  'CPF somente dígitos (11). Dado pessoal: preenchido no checkout, nunca exposto a outros usuários.';
comment on column public.profiles.phone is
  'Telefone somente dígitos, com DDD (DDI opcional), 10 a 15 dígitos. Dado pessoal.';
comment on column public.profiles.avatar_url is
  'URL https do avatar (pós-MVP: objeto no bucket avatars).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.app_role not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is
  'Papéis do usuário (ADR-005). Escrita SOMENTE por service role/SQL (supabase/scripts/grant-admin.sql). Nunca derivar de user_metadata.';

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  name        text not null,
  position    integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint categories_slug_key unique (slug),
  constraint categories_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100
  ),
  constraint categories_name_not_blank check (btrim(name) <> '' and char_length(name) <= 100),
  constraint categories_position_nonnegative check (position >= 0),
  constraint categories_position_key unique (position) deferrable initially deferred
);

comment on table public.categories is 'Categorias do catálogo (ex.: Game Design, Programação de Jogos).';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table public.courses (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null,
  title              text not null,
  subtitle           text,
  description        text not null default '',
  cover_path         text,
  category_id        uuid references public.categories (id) on delete restrict,
  level              public.course_level not null default 'beginner',
  price_cents        integer not null default 0,
  status             public.course_status not null default 'draft',
  published_at       timestamptz,
  estimated_minutes  integer,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint courses_slug_key unique (slug),
  constraint courses_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100
  ),
  constraint courses_title_not_blank check (btrim(title) <> '' and char_length(title) <= 200),
  constraint courses_subtitle_length check (subtitle is null or char_length(subtitle) <= 300),
  constraint courses_price_nonnegative check (price_cents >= 0),
  -- Cursos gratuitos estão fora do MVP: um curso publicado precisa ter preço.
  constraint courses_published_requires_price check (status <> 'published' or price_cents > 0),
  constraint courses_published_at_coherent check (status <> 'published' or published_at is not null),
  constraint courses_estimated_minutes_nonnegative check (estimated_minutes is null or estimated_minutes >= 0),
  constraint courses_cover_path_safe check (
    cover_path is null or (
      cover_path !~ '^/' and cover_path !~ '(^|/)\.\.(/|$)' and cover_path !~ '[[:cntrl:]\\]'
    )
  )
);

comment on table public.courses is 'Curso: único produto vendável do MVP (ADR-004).';
comment on column public.courses.slug is 'Identificador da URL pública (/cursos/[slug]). kebab-case minúsculo.';
comment on column public.courses.description is 'Descrição em markdown (renderizada com sanitização).';
comment on column public.courses.cover_path is 'Chave do objeto no bucket público course-covers (sem o nome do bucket).';
comment on column public.courses.price_cents is
  'Preço em centavos BRL. 0 só é permitido fora de published (cursos gratuitos fora do MVP).';
comment on column public.courses.published_at is
  'Data da PRIMEIRA publicação. Mantida pelo trigger courses_set_published_at; valor enviado pelo client é ignorado.';
comment on column public.courses.estimated_minutes is 'Duração estimada (manual). Totais reais vêm da view course_catalog (DB-003).';

create index courses_category_id_idx on public.courses (category_id);
create index courses_status_published_at_idx on public.courses (status, published_at desc);

-- published_at pertence ao banco:
--   INSERT: now() se já nasce published, senão null.
--   UPDATE entrando em published: mantém a data da primeira publicação ou usa now().
--   Qualquer outro UPDATE: preserva o valor anterior (não editável).
create function public.courses_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := case when new.status = 'published' then pg_catalog.now() else null end;
  elsif new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(old.published_at, pg_catalog.now());
  else
    new.published_at := old.published_at;
  end if;
  return new;
end;
$$;

create trigger courses_set_published_at
  before insert or update on public.courses
  for each row execute function public.courses_set_published_at();

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- course_modules
-- -----------------------------------------------------------------------------
create table public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  position    integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint course_modules_title_not_blank check (btrim(title) <> '' and char_length(title) <= 200),
  constraint course_modules_position_nonnegative check (position >= 0),
  constraint course_modules_course_position_key unique (course_id, position) deferrable initially deferred,
  -- Alvo da FK composta de lessons (garante lessons.course_id = módulo.course_id).
  constraint course_modules_id_course_key unique (id, course_id)
);

comment on table public.course_modules is 'Módulos de um curso, ordenados por position (único por curso, deferrable para reordenação).';

create trigger course_modules_set_updated_at
  before update on public.course_modules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lessons
-- -----------------------------------------------------------------------------
create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null,
  course_id         uuid not null,
  title             text not null,
  summary           text,
  position          integer not null,
  duration_seconds  integer,
  is_preview        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- FK composta: lessons.course_id SEMPRE igual ao course_id do módulo pai.
  -- on update cascade propaga a mudança se o módulo trocar de curso.
  constraint lessons_module_fkey foreign key (module_id, course_id)
    references public.course_modules (id, course_id) on update cascade on delete cascade,
  constraint lessons_title_not_blank check (btrim(title) <> '' and char_length(title) <= 200),
  constraint lessons_position_nonnegative check (position >= 0),
  constraint lessons_duration_nonnegative check (duration_seconds is null or duration_seconds >= 0),
  constraint lessons_module_position_key unique (module_id, position) deferrable initially deferred,
  -- Alvo das FKs compostas de lesson_materials e lesson_progress.
  constraint lessons_id_course_key unique (id, course_id)
);

comment on table public.lessons is 'Aulas de um módulo, ordenadas por position (único por módulo, deferrable).';
comment on column public.lessons.course_id is
  'Denormalizado do módulo pai para RLS/consultas. Preenchido pelo trigger lessons_sync_course_id (valor enviado é ignorado).';
comment on column public.lessons.is_preview is
  'Aula de degustação: materiais visíveis a anon/sem acesso se o curso estiver publicado (policies no DB-003).';

create index lessons_course_id_idx on public.lessons (course_id);

-- Copia course_id do módulo pai, sobrescrevendo o valor enviado.
-- SECURITY DEFINER para não depender das policies de SELECT do chamador
-- (funções que retornam trigger não podem ser chamadas diretamente).
create function public.lessons_sync_course_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
begin
  select m.course_id into v_course_id
  from public.course_modules m
  where m.id = new.module_id;

  if v_course_id is null then
    raise exception 'course_modules % não existe', new.module_id
      using errcode = 'foreign_key_violation';
  end if;

  new.course_id := v_course_id;
  return new;
end;
$$;

create trigger lessons_sync_course_id
  before insert or update of module_id, course_id on public.lessons
  for each row execute function public.lessons_sync_course_id();

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lesson_materials
-- -----------------------------------------------------------------------------
create table public.lesson_materials (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null,
  course_id       uuid not null,
  type            public.material_type not null,
  title           text,
  position        integer not null,
  body            text,
  storage_path    text,
  file_name       text,
  file_size       bigint,
  mime_type       text,
  external_url    text,
  video_provider  text,
  video_id        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint lesson_materials_lesson_fkey foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on update cascade on delete cascade,
  constraint lesson_materials_title_length check (title is null or char_length(title) <= 200),
  constraint lesson_materials_position_nonnegative check (position >= 0),
  constraint lesson_materials_lesson_position_key unique (lesson_id, position) deferrable initially deferred,
  constraint lesson_materials_video_provider_check check (
    video_provider is null or video_provider in ('youtube', 'vimeo', 'bunny')
  ),
  -- Só caracteres seguros para montar a URL do embed (sem injeção de query/host).
  -- Formato "a/b" cobre Vimeo não listado (id/hash) e Bunny (libraryId/videoId).
  constraint lesson_materials_video_id_format check (
    video_id is null or (video_id ~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)?$' and char_length(video_id) <= 128)
  ),
  -- Apenas http(s): impede javascript:/data: em href.
  constraint lesson_materials_external_url_format check (
    external_url is null or (external_url ~* '^https?://[^[:space:]]+$' and char_length(external_url) <= 2048)
  ),
  -- Chave relativa ao bucket course-content: sem "/" inicial, sem "..", sem controle/backslash.
  constraint lesson_materials_storage_path_safe check (
    storage_path is null or (
      btrim(storage_path) <> ''
      and storage_path !~ '^/'
      and storage_path !~ '(^|/)\.\.(/|$)'
      and storage_path !~ '[[:cntrl:]\\]'
      and char_length(storage_path) <= 1024
    )
  ),
  constraint lesson_materials_file_size_nonnegative check (file_size is null or file_size >= 0),
  -- Cada tipo exige os seus campos e proíbe os campos dos outros tipos.
  constraint lesson_materials_type_fields_check check (
    case type
      when 'video' then
        video_provider is not null and video_id is not null
        and body is null and storage_path is null and external_url is null
        and file_name is null and file_size is null and mime_type is null
      when 'text' then
        body is not null and btrim(body) <> ''
        and storage_path is null and external_url is null
        and video_provider is null and video_id is null
        and file_name is null and file_size is null and mime_type is null
      when 'file' then
        storage_path is not null
        and body is null and external_url is null
        and video_provider is null and video_id is null
      when 'link' then
        external_url is not null
        and body is null and storage_path is null
        and video_provider is null and video_id is null
        and file_name is null and file_size is null and mime_type is null
      else false
    end
  )
);

comment on table public.lesson_materials is
  'Materiais de uma aula (vídeo embed, texto markdown, arquivo para download, link), ordenados por position. Conteúdo pago: leitura só com has_course_access ou aula preview (DB-003).';
comment on column public.lesson_materials.course_id is
  'Denormalizado da aula pai para RLS. Preenchido pelo trigger lesson_materials_sync_course_id (valor enviado é ignorado).';
comment on column public.lesson_materials.body is 'Markdown (type=text). Renderizado com sanitização.';
comment on column public.lesson_materials.storage_path is
  'Chave do objeto no bucket PRIVADO course-content, convenção {course_id}/{lesson_id}/{uuid}-{nome} (type=file). Entregue só via signed URL curta gerada no servidor.';
comment on column public.lesson_materials.external_url is 'URL http(s) externa (type=link).';
comment on column public.lesson_materials.video_provider is 'youtube | vimeo | bunny (type=video).';
comment on column public.lesson_materials.video_id is
  'Id do vídeo no provedor (type=video). Só [A-Za-z0-9_-], com no máximo um "/" (ex.: id/hash no Vimeo).';

create index lesson_materials_course_id_idx on public.lesson_materials (course_id);

create function public.lesson_materials_sync_course_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
begin
  select l.course_id into v_course_id
  from public.lessons l
  where l.id = new.lesson_id;

  if v_course_id is null then
    raise exception 'lessons % não existe', new.lesson_id
      using errcode = 'foreign_key_violation';
  end if;

  new.course_id := v_course_id;
  return new;
end;
$$;

create trigger lesson_materials_sync_course_id
  before insert or update of lesson_id, course_id on public.lesson_materials
  for each row execute function public.lesson_materials_sync_course_id();

create trigger lesson_materials_set_updated_at
  before update on public.lesson_materials
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Privilégios: funções de trigger não são API
-- -----------------------------------------------------------------------------
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.courses_set_published_at() from public, anon, authenticated;
revoke all on function public.lessons_sync_course_id() from public, anon, authenticated;
revoke all on function public.lesson_materials_sync_course_id() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS habilitada + tabelas fechadas até o DB-003
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.categories       enable row level security;
alter table public.courses          enable row level security;
alter table public.course_modules   enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_materials enable row level security;

revoke all on table public.profiles         from anon, authenticated;
revoke all on table public.user_roles       from anon, authenticated;
revoke all on table public.categories       from anon, authenticated;
revoke all on table public.courses          from anon, authenticated;
revoke all on table public.course_modules   from anon, authenticated;
revoke all on table public.lessons          from anon, authenticated;
revoke all on table public.lesson_materials from anon, authenticated;
