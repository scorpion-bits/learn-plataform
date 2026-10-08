-- =============================================================================
-- Seed de desenvolvimento (DB-007)
-- =============================================================================
-- ATENÇÃO: SOMENTE LOCAL. Cria usuários de teste com senha conhecida
-- (password123). NUNCA rodar em produção.
--
-- Executado automaticamente por `supabase db reset` (após as migrations).
--
-- Conteúdo:
--   - 3 categorias (Programação de Jogos, Game Design, Arte 2D);
--   - "Godot do zero: seu primeiro jogo": publicado, 3 módulos, 10 aulas
--     (2 com is_preview) e materiais dos 4 tipos (video, text, file, link);
--   - "Pixel art para jogos": rascunho;
--   - admin@local.test (papel admin) e aluno@local.test (matrícula admin_grant
--     no curso publicado e 3 aulas concluídas).
--
-- Usuários são inseridos em auth.users com o mesmo formato do seed do Supabase
-- CLI; o trigger handle_new_user() cria profile e papel student. O admin recebe
-- user_roles 'admin' explicitamente (escrita de papel só por SQL, ADR-005).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usuários de teste (auth.users + auth.identities)
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'admin@local.test',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Local"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'aluno@local.test',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aluno Local"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@local.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '{"sub":"a0000000-0000-0000-0000-000000000002","email":"aluno@local.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email', now(), now(), now()
  );

-- Admin: papel concedido explicitamente (handle_new_user já criou 'student').
insert into public.user_roles (user_id, role)
values ('a0000000-0000-0000-0000-000000000001', 'admin')
on conflict (user_id, role) do nothing;

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
insert into public.categories (id, slug, name, position) values
  ('c0000000-0000-0000-0000-000000000001', 'programacao-de-jogos', 'Programação de Jogos', 0),
  ('c0000000-0000-0000-0000-000000000002', 'game-design',          'Game Design',          1),
  ('c0000000-0000-0000-0000-000000000003', 'arte-2d',              'Arte 2D',              2);

-- -----------------------------------------------------------------------------
-- Cursos
-- -----------------------------------------------------------------------------
insert into public.courses (
  id, slug, title, subtitle, description, category_id, level,
  price_cents, status, estimated_minutes, created_by
) values
  (
    '20000000-0000-0000-0000-000000000001',
    'godot-do-zero-primeiro-jogo',
    'Godot do zero: seu primeiro jogo',
    'Da instalação ao menu do seu jogo, passo a passo.',
    $md$Aprenda a fazer um jogo 2D completo com a Godot Engine, sem experiência prévia.

Você vai criar um personagem que anda e pula, enfrentar inimigos, contar pontos e exportar o jogo para jogar no computador.

## O que você vai aprender

- Interface e cenas da Godot
- GDScript do zero
- Física, colisões e plataformas
- Interface, menus e exportação$md$,
    'c0000000-0000-0000-0000-000000000001',
    'beginner',
    19700,
    'published',
    240,
    'a0000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'pixel-art-para-jogos',
    'Pixel art para jogos',
    'Sprites, paletas e animações para o seu jogo indie.',
    'Curso em produção. Em breve disponível.',
    'c0000000-0000-0000-0000-000000000003',
    'beginner',
    14900,
    'draft',
    180,
    'a0000000-0000-0000-0000-000000000001'
  );

-- -----------------------------------------------------------------------------
-- Módulos do curso publicado (3)
-- -----------------------------------------------------------------------------
insert into public.course_modules (id, course_id, title, position) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Primeiros passos com a Godot', 0),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Movimento e colisões', 1),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Seu primeiro jogo completo', 2);

-- -----------------------------------------------------------------------------
-- Aulas (10; L1 e L2 são preview). course_id é preenchido pelo trigger.
-- -----------------------------------------------------------------------------
insert into public.lessons (
  id, module_id, course_id, title, summary, position, duration_seconds, is_preview
) values
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Instalando a Godot e conhecendo a interface', 'Download, instalação e primeiro projeto.', 0, 780, true),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Cenas e nós', 'Como a Godot organiza o jogo em cenas e nós.', 1, 960, true),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Seu primeiro script em GDScript', 'Variáveis, funções e o ciclo de vida de um nó.', 2, 1140, false),
  ('10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Lendo o teclado', 'Input map e movimento horizontal.', 0, 900, false),
  ('10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Personagem que anda e pula', 'Gravidade, pulo e controle de velocidade.', 1, 1320, false),
  ('10000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Colisões e plataformas', 'CharacterBody2D, TileMap e colisores.', 2, 1200, false),
  ('10000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Inimigos simples', 'Patrulha, detecção e dano ao jogador.', 0, 1080, false),
  ('10000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Pontuação e interface', 'Labels, sinais e HUD.', 1, 840, false),
  ('10000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Menu, pausa e reinício', 'Troca de cenas e estados do jogo.', 2, 990, false),
  ('10000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Exportando seu jogo', 'Export templates e distribuição para Windows, Linux e web.', 3, 660, false);

-- -----------------------------------------------------------------------------
-- Materiais (4 tipos). lesson_materials.course_id é preenchido pelo trigger.
-- Vídeos usam ids de placeholder: trocar por ids reais do YouTube ao publicar.
-- -----------------------------------------------------------------------------
insert into public.lesson_materials (
  id, lesson_id, type, title, position, body, storage_path, file_name, file_size,
  mime_type, external_url, video_provider, video_id
) values
  -- L1 (preview)
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'video',
   'Vídeo: instalação', 0, null, null, null, null, null, null, 'youtube', 'godot-l1-video'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'text',
   'Antes de começar', 1,
   $md$Você precisa de um computador com Windows, Linux ou macOS e cerca de 200 MB livres para a Godot.

Baixe sempre a versão estável mais recente no site oficial.$md$,
   null, null, null, null, null, null, null),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'link',
   'Documentação oficial', 2, null, null, null, null, null,
   'https://docs.godotengine.org/', null, null),
  -- L2 (preview)
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'video',
   'Vídeo: cenas e nós', 0, null, null, null, null, null, null, 'youtube', 'godot-l2-video'),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'file',
   'Projeto de exemplo (cenas)', 1, null,
   '20000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000002/6f1c2a10-7b3e-4d5f-9a1b-0c2d3e4f5a6b-cenas-exemplo.zip',
   'cenas-exemplo.zip', 24576, 'application/zip', null, null, null),
  -- L3
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'text',
   'GDScript em poucas linhas', 0,
   $md$```gdscript
extends Node2D

var pontos: int = 0

func _ready() -> void:
	print("Olá, Godot!")
```

Cada script é anexado a um nó e herda o seu ciclo de vida.$md$,
   null, null, null, null, null, null, null),
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'video',
   'Vídeo: primeiro script', 1, null, null, null, null, null, null, 'youtube', 'godot-l3-video'),
  -- L4
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'video',
   'Vídeo: input', 0, null, null, null, null, null, null, 'youtube', 'godot-l4-video'),
  ('50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', 'text',
   'Mapa de ações', 1,
   'Configure as ações "mover_esquerda", "mover_direita" e "pular" em Projeto > Configurações do Projeto > Mapa de Entrada.',
   null, null, null, null, null, null, null),
  -- L5
  ('50000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'video',
   'Vídeo: pulo e gravidade', 0, null, null, null, null, null, null, 'youtube', 'godot-l5-video'),
  ('50000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', 'file',
   'Sprites do personagem', 1, null,
   '20000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000005/9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a-personagem-base.zip',
   'personagem-base.zip', 1048576, 'application/zip', null, null, null),
  -- L6
  ('50000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'text',
   'Colisores na prática', 0,
   'Todo corpo físico precisa de um CollisionShape2D. Confira a forma do colisor antes de criar o tilemap.',
   null, null, null, null, null, null, null),
  ('50000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', 'link',
   'Referência de física 2D', 1, null, null, null, null, null,
   'https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html', null, null),
  -- L7
  ('50000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'video',
   'Vídeo: inimigo patrulheiro', 0, null, null, null, null, null, null, 'youtube', 'godot-l7-video'),
  ('50000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000007', 'text',
   'Checklist do inimigo', 1,
   '- Patrulha entre dois pontos\n- Detecção por Area2D\n- Dano ao jogador ao colidir',
   null, null, null, null, null, null, null),
  -- L8
  ('50000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'video',
   'Vídeo: HUD', 0, null, null, null, null, null, null, 'youtube', 'godot-l8-video'),
  ('50000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000008', 'file',
   'Ícones do HUD', 1, null,
   '20000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000008/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d-hud-icones.zip',
   'hud-icones.zip', 524288, 'application/zip', null, null, null),
  -- L9
  ('50000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'text',
   'Estados do jogo', 0,
   'Use um nó "GameManager" com uma variável de estado (menu, jogando, pausado) para controlar as trocas de cena.',
   null, null, null, null, null, null, null),
  ('50000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000009', 'video',
   'Vídeo: menu e pausa', 1, null, null, null, null, null, null, 'youtube', 'godot-l9-video'),
  -- L10
  ('50000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000010', 'text',
   'Checklist de exportação', 0,
   'Instale os export templates pelo menu Editor > Gerenciar Export Templates antes de exportar.',
   null, null, null, null, null, null, null),
  ('50000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000010', 'link',
   'Guia oficial de exportação', 1, null, null, null, null, null,
   'https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html', null, null);

-- -----------------------------------------------------------------------------
-- Matrícula do aluno (admin_grant) e progresso (3 aulas concluídas)
-- -----------------------------------------------------------------------------
insert into public.enrollments (user_id, course_id, source, granted_by, granted_at)
values (
  'a0000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'admin_grant',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '7 days'
);

insert into public.lesson_progress (user_id, lesson_id, course_id, completed_at, last_position_seconds)
values
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', now() - interval '6 days', 780),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', now() - interval '5 days', 960),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', now() - interval '4 days', 1140);
