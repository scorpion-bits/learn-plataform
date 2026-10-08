-- =============================================================================
-- PAY-003 — fulfill_order aceita pedidos `failed`
-- =============================================================================
-- Caso: no PAY-002, um timeout/erro ao criar a cobrança marca o pedido `failed`,
-- mas a cobrança pode ter sido criada no provedor e paga pelo aluno. Quando a
-- AbacatePay confirma (webhook transparent.completed + reconsulta = PAID), o
-- dinheiro entrou e o acesso é devido: `failed -> paid`.
--
-- Única mudança em relação a 20261008000003_rls_functions.sql: o status aceito
-- passa de ('pending', 'expired') para ('pending', 'expired', 'failed').
-- `canceled` e `refunded` continuam recusados (invalid_status, tratamento manual).
-- Assinatura, segurança, grants e códigos de resultado idênticos.
-- =============================================================================

create or replace function public.fulfill_order(
  p_order_id uuid,
  p_provider_billing_id text,
  p_amount_cents integer,
  p_event_id text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_enrollment_id uuid;
  v_result text;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    v_result := 'order_not_found';
  elsif v_order.status = 'paid' then
    v_result := 'already_paid';
  elsif v_order.status not in ('pending', 'expired', 'failed') then
    v_result := 'invalid_status';
  elsif p_amount_cents is distinct from v_order.amount_cents then
    v_result := 'amount_mismatch';
  elsif v_order.provider_billing_id is not null
        and p_provider_billing_id is distinct from v_order.provider_billing_id then
    v_result := 'billing_mismatch';
  else
    update public.orders o
       set status = 'paid',
           paid_at = pg_catalog.now(),
           provider_billing_id = coalesce(o.provider_billing_id, p_provider_billing_id)
     where o.id = v_order.id;

    -- Pedido já está 'paid' (exigido por enrollments_guard).
    insert into public.enrollments (user_id, course_id, source, order_id)
    values (v_order.user_id, v_order.course_id, 'purchase', v_order.id)
    on conflict (user_id, course_id, source) where revoked_at is null do nothing
    returning id into v_enrollment_id;

    v_result := case when v_enrollment_id is null then 'paid_already_enrolled' else 'fulfilled' end;
  end if;

  if p_event_id is not null then
    update public.payment_events pe
       set order_id = coalesce(pe.order_id, v_order.id),
           processed_at = case
             when v_result in ('fulfilled', 'already_paid', 'paid_already_enrolled') then pg_catalog.now()
           end,
           processing_error = case
             when v_result in ('fulfilled', 'already_paid') then null
             else 'fulfill_order: ' || v_result
           end
     where pe.provider_event_id = p_event_id;
  end if;

  return v_result;
end;
$$;

comment on function public.fulfill_order(uuid, text, integer, text) is
  'Webhook (service role): marca pedido pago (pending/expired/failed -> paid) e cria matrícula purchase de forma atômica e idempotente. Retorna fulfilled | paid_already_enrolled | already_paid | order_not_found | invalid_status | amount_mismatch | billing_mismatch.';

-- `create or replace` preserva os privilégios; reafirmados por clareza.
revoke all on function public.fulfill_order(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_order(uuid, text, integer, text) to service_role;
