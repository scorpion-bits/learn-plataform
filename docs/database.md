# Banco de dados

> Postgres (Supabase). Toda mudança via `supabase/migrations/*.sql`. Nunca editar schema pelo dashboard.
> Status: §1–3 **implementados** em `supabase/migrations/20261008000001_core_schema.sql` (DB-001) e `20261008000002_access_commerce.sql` (DB-002); §4–6 serão materializados em `DB-003..DB-004`. Ajustes durante implementação devem atualizar este arquivo.

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
| cover_path | text | chave do objeto em `course-covers` (sem o nome do bucket) |
| category_id | uuid → categories on delete restrict | |
| level | course_level ('beginner','intermediate','advanced') not null default 'beginner' | |
| price_cents | integer not null default 0 check ≥ 0 | 0 = gratuito (ver nota) |
| status | course_status ('draft','published','archived') default 'draft' | |
| published_at | timestamptz | data da **primeira** publicação; mantida por trigger (valor enviado é ignorado) |
| estimated_minutes | integer | calculado ou manual |
| created_by | uuid → auth.users on delete set null | |

Contagem de aulas e duração total vêm da view `course_catalog` (somente cursos `published`).
Nota: cursos gratuitos estão **fora do MVP** (não antecipamos `source='free'`). Curso com `price_cents = 0` não pode ser publicado — validado na action de publicação **e** no banco (check `courses_published_requires_price`). Adicionar um valor ao enum depois é barato.

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
| type | material_type ('video','text','file','link') | sem `pdf` (decisão do produto: não haverá PDFs; arquivos para download usam `file`). Expandir com `html_bundle`, `exercise` depois |
| title | text | |
| position | int | |
| body | text | markdown (type=text) |
| storage_path | text | chave no bucket `course-content`: `{course_id}/{lesson_id}/{uuid}-{nome}` (type=file) |
| file_name / file_size / mime_type | | |
| external_url | text | link |
| video_provider | text check in ('youtube','vimeo','bunny') | type=video |
| video_id | text | |
| check | | constraint por tipo: exige os campos do tipo **e proíbe os campos dos outros tipos** (ver §3.1) |

### enrollments
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → auth.users on delete cascade | |
| course_id | uuid → courses on delete restrict | |
| source | enrollment_source ('purchase','admin_grant') | |
| order_id | uuid → orders | not null quando source='purchase', null em 'admin_grant' (check). FK composta `(order_id, user_id, course_id)` → pedido do mesmo usuário e curso |
| granted_by | uuid → auth.users | not null quando 'admin_grant', null em 'purchase' |
| granted_at | timestamptz default now() | |
| revoked_at / revoked_by / revoke_reason | | revogação lógica: os três juntos, **exceto** `revoke_reason = 'refund'` (revogação automática por reembolso, só em `purchase`), que aceita `revoked_by` nulo |
| created_at / updated_at | timestamptz | |
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
| provider | text default 'abacatepay' | `abacatepay` (checkout) ou `manual` (venda manual) |
| provider_billing_id | text unique | id da cobrança (`pix_char_…`); nulo até a cobrança ser criada, depois imutável |
| pix_br_code | text | PIX copia-e-cola (Checkout Transparente, `docs/payments.md`); nulo até a cobrança |
| pix_br_code_base64 | text | imagem do QR; nulo até a cobrança |
| expires_at | timestamptz | expiração da cobrança PIX |
| paid_at | timestamptz | obrigatório se status ∈ (paid, refunded) |
| refund_requested_at | timestamptz | pedido de reembolso do aluno (até `paid_at + 7 dias`, validado na action); exige `paid_at` |
| refunded_at | timestamptz | obrigatório se status = refunded |
| source | order_source ('checkout','manual') default 'checkout' | venda manual registrada pelo admin |
| created_by | uuid → auth.users | obrigatório se manual, nulo se checkout |
| created_at / updated_at | timestamptz | |
| índice parcial | `(user_id, course_id) where status='pending'` unique | evita pedidos pendentes duplicados |

Sem `checkout_url`: usamos o Checkout Transparente PIX (QR na nossa página). Disputas (`transparent.disputed`) **não** mudam `order_status` — ficam só em `payment_events`; disputa perdida (`transparent.lost`) vira `refunded`. `user_id`/`course_id` são `on delete restrict` (registro financeiro: comprador e curso vendido não podem ser apagados — exclusão de conta de comprador exige processo próprio de anonimização, a definir).

### payment_events
`id`, `provider`, `provider_event_id text not null unique`, `event_type`, `order_id → orders null (on delete restrict)`, `payload jsonb`, `received_at`, `processed_at`, `processing_error`. Apenas service role escreve; admin lê.

### lesson_progress
PK `(user_id, lesson_id)`; `course_id` (denormalizado por trigger + FK composta para `lessons(id, course_id)`); `completed_at timestamptz null`; `last_position_seconds int not null default 0 (≥ 0)`; `created_at`; `updated_at`. Índice `(user_id, course_id, updated_at desc)`.

### 3.1 Regras de integridade implementadas (DB-001/DB-002)
- **RLS habilitada** em todas as tabelas e `revoke all ... from anon, authenticated`: até o DB-003 nada é acessível pelo client (service role mantém acesso).
- **`course_id` denormalizado** (`lessons`, `lesson_materials`, `lesson_progress`): trigger `BEFORE INSERT/UPDATE` copia do pai (valor enviado é ignorado) **e** FK composta `(parent_id, course_id) → parent(id, course_id) on update cascade` — se um módulo/aula mudar de curso, tudo abaixo acompanha. Funções de trigger são `security definer` com `search_path = ''` (não dependem das policies de SELECT do chamador e não são chamáveis via RPC).
- **`lesson_materials` por tipo**: `video` exige `video_provider`+`video_id`; `text` exige `body` não vazio; `file` exige `storage_path` (único tipo com `file_name/file_size/mime_type`); `link` exige `external_url`. Campos de outros tipos devem ser nulos (ao trocar o tipo, a action limpa os campos antigos).
- **Formatos defensivos**: `video_id` só `[A-Za-z0-9_-]` (com no máximo um `/`, ex.: Vimeo `id/hash`) — sem injeção na URL do embed; `external_url` só `http(s)://`; `avatar_url` só `https://`; `storage_path`/`cover_path` relativos ao bucket, sem `/` inicial, `..`, backslash ou caracteres de controle; `tax_id` 11 dígitos; `phone` 10–15 dígitos; slugs `^[a-z0-9]+(-[a-z0-9]+)*$` (≤ 100); títulos não vazios (≤ 200).
- **Posições** `≥ 0` e `unique (parent, position) deferrable initially deferred` (também em `categories.position`).
- **`orders`** (trigger `orders_guard_immutable`): `user_id`, `course_id`, `amount_cents`, `currency`, `source`, `provider`, `created_by` são imutáveis; `provider_billing_id` só pode ir de nulo para um valor. `currency = 'BRL'`, `amount_cents > 0`.
- **`enrollments`** (trigger `enrollments_guard`): nasce ativa; `purchase` só com pedido `paid` (então `fulfill_order` marca o pedido como pago **antes** de inserir a matrícula); a única alteração permitida é revogar; matrícula revogada é definitiva (novo acesso = nova linha, histórico preservado).
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
