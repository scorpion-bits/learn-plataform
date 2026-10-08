# Banco de dados

> Postgres (Supabase). Toda mudança via `supabase/migrations/*.sql`. Nunca editar schema pelo dashboard.
> Status: **proposto** — será materializado em `DB-001..DB-004`. Ajustes durante implementação devem atualizar este arquivo.

## 1. Convenções
- `snake_case`, tabelas no plural, PK `id uuid default gen_random_uuid()` (exceto tabelas de junção/progresso com PK composta).
- `created_at timestamptz not null default now()`, `updated_at` com trigger `public.set_updated_at()`.
- Dinheiro em **centavos** (`integer`), moeda `BRL`.
- Ordenação com `position integer not null`, `unique (parent_id, position) deferrable initially deferred` para permitir reordenação em transação.
- Enums Postgres para estados estáveis.
- RLS **habilitada em todas as tabelas** de `public`. Funções `SECURITY DEFINER` sempre com `set search_path = ''` e nomes qualificados.
- Índice em toda FK usada em filtro.

## 2. Diagrama

```text
auth.users
 └── profiles (1:1)                  nome, avatar, cpf/telefone (privados)
 └── user_roles (1:N, normalmente 1) role: admin | student
 └── enrollments (N) ───────────────▶ courses
 │     source: purchase | admin_grant, order_id?, revoked_at?
 └── orders (N) ────────────────────▶ courses
 │     status: pending|paid|failed|expired|refunded|canceled
 │     └── payment_events (N)        eventos brutos do provedor (dedupe)
 └── lesson_progress (N) ───────────▶ lessons

categories (1:N) ─▶ courses
courses
 └── course_modules (1:N, position)
      └── lessons (1:N, position, is_preview)
           └── lesson_materials (1:N, position, type)
```

## 3. Tabelas

### profiles
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK → auth.users on delete cascade | |
| full_name | text not null default '' | |
| avatar_url | text | |
| tax_id | text | CPF só dígitos; preenchido no checkout |
| phone | text | |
| created_at / updated_at | timestamptz | |

Email **não** é duplicado (vem de `auth.users`; admin lê via view `admin_students` com security definer/service). Usuário só pode atualizar `full_name`, `avatar_url`, `tax_id`, `phone` (column-level `GRANT UPDATE`).

### user_roles
`user_id uuid → auth.users`, `role app_role ('admin','student')`, PK `(user_id, role)`. Sem INSERT/UPDATE/DELETE para `authenticated`. Admin concedido por script (`supabase/scripts/grant-admin.sql`) ou service role.

### categories
`id`, `slug unique`, `name`, `position`. Ex.: "Game Design", "Programação de Jogos", "Arte 2D". (Expansão futura: Web, Ferramentas.)

### courses
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| slug | text unique not null | URL pública |
| title | text not null | |
| subtitle | text | linha curta do card |
| description | text not null default '' | markdown |
| cover_path | text | objeto em `course-covers` |
| category_id | uuid → categories | |
| level | course_level ('beginner','intermediate','advanced') | |
| price_cents | integer not null default 0 check ≥ 0 | 0 = gratuito (ver nota) |
| status | course_status ('draft','published','archived') default 'draft' | |
| published_at | timestamptz | |
| estimated_minutes | integer | calculado ou manual |
| created_by | uuid → auth.users | |

Contagem de aulas e duração total vêm da view `course_catalog` (somente cursos `published`).
Nota: cursos gratuitos estão **fora do MVP** (não antecipamos `source='free'`). Curso com `price_cents = 0` não pode ser publicado — validado na action de publicação. Adicionar um valor ao enum depois é barato.

### course_modules
`id`, `course_id → courses on delete cascade`, `title`, `position`, timestamps. `unique(course_id, position) deferrable`.

### lessons
`id`, `module_id → course_modules on delete cascade`, `course_id → courses` (denormalizado para RLS/consultas; consistência garantida por trigger), `title`, `summary`, `position`, `duration_seconds int`, `is_preview bool default false`, timestamps.

### lesson_materials
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| lesson_id | uuid → lessons on delete cascade | |
| course_id | uuid | denormalizado (trigger) |
| type | material_type ('video','text','pdf','file','link') | expandir com `html_bundle`, `exercise` depois |
| title | text | |
| position | int | |
| body | text | markdown (type=text) |
| storage_path | text | `course-content/{course_id}/{lesson_id}/{uuid}-{nome}` (pdf/file) |
| file_name / file_size / mime_type | | |
| external_url | text | link |
| video_provider | text check in ('youtube','vimeo','bunny') | type=video |
| video_id | text | |
| check | | constraint por tipo garantindo campos obrigatórios |

### enrollments
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → auth.users on delete cascade | |
| course_id | uuid → courses on delete restrict | |
| source | enrollment_source ('purchase','admin_grant') | |
| order_id | uuid → orders | not null quando source='purchase' (check) |
| granted_by | uuid → auth.users | not null quando 'admin_grant' |
| granted_at | timestamptz default now() | |
| revoked_at / revoked_by / revoke_reason | | revogação lógica |
| unique parcial | `(user_id, course_id, source) where revoked_at is null` | |
| unique | `(order_id)` | um pedido gera no máximo uma matrícula |

### orders
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | enviado ao provedor como `externalId` |
| user_id | uuid → auth.users | |
| course_id | uuid → courses | |
| amount_cents | int not null | snapshot do preço |
| currency | text default 'BRL' | |
| status | order_status ('pending','paid','failed','expired','refunded','canceled') | |
| provider | text default 'abacatepay' | |
| provider_billing_id | text unique | |
| checkout_url | text | |
| paid_at / expires_at | timestamptz | |
| source | order_source ('checkout','manual') | venda manual registrada pelo admin |
| created_by | uuid | admin, se manual |
| índice parcial | `(user_id, course_id) where status='pending'` unique | evita pedidos pendentes duplicados |

### payment_events
`id`, `provider`, `provider_event_id text unique`, `event_type`, `order_id → orders null`, `payload jsonb`, `received_at`, `processed_at`, `processing_error`. Apenas service role escreve; admin lê.

### lesson_progress
PK `(user_id, lesson_id)`; `course_id`; `completed_at timestamptz null`; `last_position_seconds int`; `updated_at`. Índice `(user_id, course_id, updated_at desc)`.

## 4. Funções
| função | tipo | uso |
|---|---|---|
| `is_admin()` | stable, security definer | policies, guards |
| `has_course_access(p_course_id uuid)` | stable, security definer | policies de lessons/materials/progress; inclui admin |
| `handle_new_user()` | trigger security definer | cria profile + role student; **ignora metadata.role** |
| `fulfill_order(p_order_id, p_provider_billing_id, p_amount_cents, p_event_id)` | security definer, **executável só pelo service role** | transação idempotente: valida valor, marca pago, cria enrollment |
| `admin_dashboard_metrics(p_from, p_to)` | security definer com checagem `is_admin()` | receita, vendas, alunos, matrículas, top cursos |
| `reorder_modules(course_id, ids[])` / `reorder_lessons(module_id, ids[])` / `reorder_materials(lesson_id, ids[])` | invoker | reordenação atômica |

`revoke execute on function ... from public, anon` em tudo que não for para anon.

## 5. Views
- `course_catalog` (security_invoker): cursos publicados + categoria + `lesson_count` + `total_duration_seconds`.
- `course_outline` (security_invoker): módulos/aulas (títulos, duração, `is_preview`) de cursos publicados — ementa pública.
- `my_library` (security_invoker): matrículas ativas do usuário + origem + progresso agregado + último acesso.
- `admin_students` (acesso só admin): perfis + email + contagem de matrículas + total gasto.

## 6. Storage
| bucket | público | leitura | escrita |
|---|---|---|---|
| `course-covers` | sim | todos | admin (policy `is_admin()`) |
| `course-content` | não | **ninguém via client** — signed URL gerada no servidor após `has_course_access` | admin |
| `avatars` | sim | todos | dono (pasta `{user_id}/`) — pós-MVP |

## 7. Migração de dados do projeto antigo
Ver `REL-002` (só se houver dados reais). Mapeamento: `user_courses` (assigned_by null) → `enrollments(purchase)` com `orders(manual)` sintético; `assigned_by` não nulo → `admin_grant`; `sales` → `orders(status='paid')`.
