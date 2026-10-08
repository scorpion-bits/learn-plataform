-- =============================================================================
-- DB-002 — Schema de acesso, comércio e progresso
-- =============================================================================
-- Materializa docs/database.md §3 (orders, payment_events, enrollments,
-- lesson_progress) e as ADRs 006 (matrícula com origem e revogação lógica),
-- 007 (progresso no banco), 008 (pedido é a fonte da verdade) e 017
-- (reembolso revoga o acesso).
--
-- Pagamento: Checkout Transparente PIX da AbacatePay (docs/payments.md). O QR é
-- exibido na nossa página, por isso guardamos o copia-e-cola (pix_br_code) e a
-- imagem (pix_br_code_base64) em vez de uma checkout_url.
--
-- Segurança: RLS habilitada e privilégios de anon/authenticated revogados.
-- Policies, has_course_access() e fulfill_order() chegam no DB-003.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.enrollment_source as enum ('purchase', 'admin_grant');
-- Disputas (MED) NÃO são um status: ficam registradas só em payment_events.
-- Disputa perdida (transparent.lost) vira 'refunded'.
create type public.order_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded', 'canceled');
create type public.order_source as enum ('checkout', 'manual');

comment on type public.enrollment_source is
  'Origem da concessão de acesso: purchase (pedido pago) ou admin_grant (atribuição manual). Cursos gratuitos fora do MVP.';
comment on type public.order_status is
  'Estado do pedido. Disputas não mudam o status (só payment_events); disputa perdida = refunded.';
comment on type public.order_source is
  'checkout = compra pelo site (PIX AbacatePay); manual = venda registrada pelo admin.';

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete restrict,
  course_id            uuid not null references public.courses (id) on delete restrict,
  amount_cents         integer not null,
  currency             text not null default 'BRL',
  status               public.order_status not null default 'pending',
  source               public.order_source not null default 'checkout',
  provider             text not null default 'abacatepay',
  provider_billing_id  text,
  pix_br_code          text,
  pix_br_code_base64   text,
  expires_at           timestamptz,
  paid_at              timestamptz,
  refund_requested_at  timestamptz,
  refunded_at          timestamptz,
  created_by           uuid references auth.users (id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint orders_amount_positive check (amount_cents > 0),
  constraint orders_currency_brl check (currency = 'BRL'),
  constraint orders_provider_check check (provider in ('abacatepay', 'manual')),
  constraint orders_provider_billing_id_key unique (provider_billing_id),
  -- checkout: cobrança no provedor, sem autor admin.
  -- manual: venda registrada por um admin, sem cobrança no provedor.
  constraint orders_source_coherent check (
    (source = 'checkout' and provider <> 'manual' and created_by is null)
    or (
      source = 'manual' and provider = 'manual' and created_by is not null
      and provider_billing_id is null and pix_br_code is null and pix_br_code_base64 is null
    )
  ),
  constraint orders_paid_at_coherent check (status not in ('paid', 'refunded') or paid_at is not null),
  constraint orders_refunded_at_coherent check (status <> 'refunded' or refunded_at is not null),
  constraint orders_refund_requested_after_paid check (refund_requested_at is null or paid_at is not null),
  -- Alvo da FK composta de enrollments (matrícula de compra é do mesmo usuário/curso do pedido).
  constraint orders_id_user_course_key unique (id, user_id, course_id)
);

comment on table public.orders is
  'Pedido de compra de um curso (ADR-008): fonte da verdade do pagamento. Escrita só pelo servidor (service role) e por fulfill_order().';
comment on column public.orders.id is 'Enviado ao provedor como externalId.';
comment on column public.orders.amount_cents is
  'Snapshot do preço em centavos no momento da criação (lido do banco, nunca do cliente). Imutável.';
comment on column public.orders.provider is 'abacatepay para checkout; manual para venda registrada pelo admin.';
comment on column public.orders.provider_billing_id is
  'Id da cobrança no provedor (ex.: pix_char_...). Nulo até a cobrança ser criada; depois imutável.';
comment on column public.orders.pix_br_code is 'PIX copia-e-cola (brCode) da cobrança transparente. Nulo até a cobrança ser criada.';
comment on column public.orders.pix_br_code_base64 is 'Imagem do QR Code PIX (brCodeBase64). Nulo até a cobrança ser criada.';
comment on column public.orders.expires_at is 'Expiração da cobrança PIX informada pelo provedor (expiresAt).';
comment on column public.orders.refund_requested_at is
  'Quando o aluno pediu reembolso (CDC art. 49: até paid_at + 7 dias; validado na action, não no banco).';
comment on column public.orders.refunded_at is 'Quando o reembolso (ou disputa perdida) foi confirmado.';
comment on column public.orders.created_by is 'Admin que registrou a venda (obrigatório se source=manual; nulo em checkout).';

-- Um único pedido pendente por usuário+curso (cobre clique duplo/voltar).
create unique index orders_one_pending_per_user_course
  on public.orders (user_id, course_id)
  where status = 'pending';

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_course_id_status_idx on public.orders (course_id, status);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_paid_at_idx on public.orders (paid_at) where paid_at is not null;
create index orders_pending_expires_at_idx on public.orders (expires_at) where status = 'pending';

-- Imutabilidade do que define o pedido (preço congelado, comprador, curso, origem).
-- provider_billing_id pode ser definido uma única vez (null -> valor).
create function public.orders_guard_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id      is distinct from old.user_id
  or new.course_id    is distinct from old.course_id
  or new.amount_cents is distinct from old.amount_cents
  or new.currency     is distinct from old.currency
  or new.source       is distinct from old.source
  or new.provider     is distinct from old.provider
  or new.created_by   is distinct from old.created_by
  or new.created_at   is distinct from old.created_at then
    raise exception 'orders: user_id, course_id, amount_cents, currency, source, provider, created_by e created_at são imutáveis'
      using errcode = 'check_violation';
  end if;

  if old.provider_billing_id is not null
     and new.provider_billing_id is distinct from old.provider_billing_id then
    raise exception 'orders: provider_billing_id já definido não pode ser alterado'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger orders_guard_immutable
  before update on public.orders
  for each row execute function public.orders_guard_immutable();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payment_events
-- -----------------------------------------------------------------------------
create table public.payment_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null default 'abacatepay',
  provider_event_id  text not null,
  event_type         text not null,
  order_id           uuid references public.orders (id) on delete restrict,
  payload            jsonb not null,
  received_at        timestamptz not null default now(),
  processed_at       timestamptz,
  processing_error   text,

  constraint payment_events_provider_event_id_key unique (provider_event_id),
  constraint payment_events_provider_event_id_not_blank check (btrim(provider_event_id) <> ''),
  constraint payment_events_event_type_not_blank check (btrim(event_type) <> '')
);

comment on table public.payment_events is
  'Eventos brutos do provedor (webhook), para dedupe e auditoria. Inclui disputas (transparent.disputed), que não alteram orders.status. Escrita só por service role; admin lê.';
comment on column public.payment_events.provider_event_id is
  'Id do evento no provedor. UNIQUE = dedupe de reentregas (INSERT ... ON CONFLICT DO NOTHING).';
comment on column public.payment_events.order_id is 'Pedido resolvido pelo externalId; nulo se não foi possível associar.';
comment on column public.payment_events.payload is 'Corpo do webhook. Não deve conter segredos; dados pessoais vêm mascarados pelo provedor.';
comment on column public.payment_events.processed_at is 'Quando o evento foi processado com sucesso; nulo = pendente/erro.';
comment on column public.payment_events.processing_error is 'Último erro de processamento (ex.: divergência de valor).';

create index payment_events_order_id_idx on public.payment_events (order_id, received_at desc);
create index payment_events_received_at_idx on public.payment_events (received_at desc);
create index payment_events_unprocessed_idx on public.payment_events (received_at) where processed_at is null;

-- -----------------------------------------------------------------------------
-- enrollments
-- -----------------------------------------------------------------------------
create table public.enrollments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  course_id      uuid not null references public.courses (id) on delete restrict,
  source         public.enrollment_source not null,
  order_id       uuid,
  granted_by     uuid references auth.users (id) on delete restrict,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_by     uuid references auth.users (id) on delete restrict,
  revoke_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Matrícula de compra aponta para um pedido DO MESMO usuário e curso.
  -- (MATCH SIMPLE: ignorada quando order_id é nulo, i.e. admin_grant.)
  constraint enrollments_order_fkey foreign key (order_id, user_id, course_id)
    references public.orders (id, user_id, course_id) on delete restrict,
  constraint enrollments_order_id_key unique (order_id),
  constraint enrollments_source_coherent check (
    (source = 'purchase' and order_id is not null and granted_by is null)
    or (source = 'admin_grant' and granted_by is not null and order_id is null)
  ),
  -- Revogação: os três campos andam juntos, com UMA exceção: revogação
  -- automática por reembolso (webhook, ADR-017) não tem um usuário autor,
  -- então revoke_reason = 'refund' (só em matrícula purchase) aceita revoked_by nulo.
  constraint enrollments_revocation_coherent check (
    (revoked_at is null and revoked_by is null and revoke_reason is null)
    or (
      revoked_at is not null
      and revoke_reason is not null and btrim(revoke_reason) <> ''
      and (revoked_by is not null or revoke_reason = 'refund')
    )
  ),
  constraint enrollments_refund_only_purchase check (revoke_reason is distinct from 'refund' or source = 'purchase'),
  constraint enrollments_revoke_reason_length check (revoke_reason is null or char_length(revoke_reason) <= 500),
  constraint enrollments_revoked_after_granted check (revoked_at is null or revoked_at >= granted_at)
);

comment on table public.enrollments is
  'Concessões de acesso a cursos (ADR-006): uma linha por concessão, com origem e revogação lógica. Acesso efetivo = existe linha com revoked_at nulo.';
comment on column public.enrollments.order_id is 'Pedido pago que gerou a matrícula (obrigatório se source=purchase; nulo em admin_grant).';
comment on column public.enrollments.granted_by is 'Admin que atribuiu (obrigatório se source=admin_grant; nulo em purchase).';
comment on column public.enrollments.revoked_by is
  'Quem revogou. Nulo apenas na revogação automática por reembolso (revoke_reason = ''refund'').';
comment on column public.enrollments.revoke_reason is
  'Motivo da revogação. Valor reservado ''refund'' = revogação automática por reembolso/disputa perdida (ADR-017).';

-- Impossível ter duas concessões ativas da mesma origem para o mesmo usuário+curso.
-- Também atende has_course_access (user_id, course_id, revoked_at is null).
create unique index enrollments_one_active_per_source
  on public.enrollments (user_id, course_id, source)
  where revoked_at is null;

create index enrollments_user_id_granted_at_idx on public.enrollments (user_id, granted_at desc);
create index enrollments_course_id_active_idx on public.enrollments (course_id) where revoked_at is null;

-- Regras que um CHECK não expressa:
--   INSERT: matrícula nasce ativa; purchase exige pedido com status 'paid'.
--   UPDATE: identidade da concessão é imutável; a única mudança permitida é
--           revogar (ativa -> revogada). Revogada é definitiva: um novo acesso
--           cria uma nova linha (o histórico nunca é apagado).
create function public.enrollments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_status public.order_status;
begin
  if tg_op = 'INSERT' then
    if new.revoked_at is not null or new.revoked_by is not null or new.revoke_reason is not null then
      raise exception 'enrollments: uma matrícula não pode ser criada já revogada'
        using errcode = 'check_violation';
    end if;

    if new.source = 'purchase' then
      select o.status into v_order_status
      from public.orders o
      where o.id = new.order_id;

      if v_order_status is distinct from 'paid' then
        raise exception 'enrollments: matrícula purchase exige pedido pago (pedido %, status %)',
          new.order_id, coalesce(v_order_status::text, 'inexistente')
          using errcode = 'check_violation';
      end if;
    end if;

    return new;
  end if;

  -- UPDATE
  if old.revoked_at is not null then
    raise exception 'enrollments: matrícula revogada é imutável (crie uma nova concessão)'
      using errcode = 'check_violation';
  end if;

  if new.user_id    is distinct from old.user_id
  or new.course_id  is distinct from old.course_id
  or new.source     is distinct from old.source
  or new.order_id   is distinct from old.order_id
  or new.granted_by is distinct from old.granted_by
  or new.granted_at is distinct from old.granted_at
  or new.created_at is distinct from old.created_at then
    raise exception 'enrollments: apenas os campos de revogação podem ser alterados'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enrollments_guard
  before insert or update on public.enrollments
  for each row execute function public.enrollments_guard();

create trigger enrollments_set_updated_at
  before update on public.enrollments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lesson_progress
-- -----------------------------------------------------------------------------
create table public.lesson_progress (
  user_id                uuid not null references auth.users (id) on delete cascade,
  lesson_id              uuid not null,
  course_id              uuid not null,
  completed_at           timestamptz,
  last_position_seconds  integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  primary key (user_id, lesson_id),
  -- FK composta: course_id sempre igual ao da aula (propaga se a aula mudar de curso).
  constraint lesson_progress_lesson_fkey foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on update cascade on delete cascade,
  constraint lesson_progress_position_nonnegative check (last_position_seconds >= 0)
);

comment on table public.lesson_progress is
  'Progresso do aluno por aula (ADR-007). "Continuar de onde parou" = linha mais recente (updated_at) do curso.';
comment on column public.lesson_progress.course_id is
  'Denormalizado da aula para RLS/agregações. Preenchido pelo trigger lesson_progress_sync_course_id (valor enviado é ignorado).';
comment on column public.lesson_progress.completed_at is 'Quando a aula foi concluída; nulo = não concluída.';
comment on column public.lesson_progress.last_position_seconds is 'Última posição do vídeo, em segundos, para retomada.';

create index lesson_progress_user_course_updated_idx
  on public.lesson_progress (user_id, course_id, updated_at desc);
create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

create function public.lesson_progress_sync_course_id()
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

create trigger lesson_progress_sync_course_id
  before insert or update of lesson_id, course_id on public.lesson_progress
  for each row execute function public.lesson_progress_sync_course_id();

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Privilégios: funções de trigger não são API
-- -----------------------------------------------------------------------------
revoke all on function public.orders_guard_immutable() from public, anon, authenticated;
revoke all on function public.enrollments_guard() from public, anon, authenticated;
revoke all on function public.lesson_progress_sync_course_id() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS habilitada + tabelas fechadas até o DB-003
-- -----------------------------------------------------------------------------
alter table public.orders          enable row level security;
alter table public.payment_events  enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

revoke all on table public.orders          from anon, authenticated;
revoke all on table public.payment_events  from anon, authenticated;
revoke all on table public.enrollments     from anon, authenticated;
revoke all on table public.lesson_progress from anon, authenticated;
