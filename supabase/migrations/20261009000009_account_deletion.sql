-- =============================================================================
-- DB-008 — Exclusão de conta pelo titular (LGPD) com anonimização
-- =============================================================================
-- orders.user_id -> auth.users é ON DELETE RESTRICT (registro financeiro/fiscal),
-- então a linha de auth.users de quem comprou NÃO pode ser apagada. O fluxo é:
--   1. public.anonymize_user(uid)  (este arquivo; service role, chamado pela
--      Server Action deleteMyAccount): apaga dados pessoais do perfil, revoga
--      matrículas, apaga progresso e marca profiles.deleted_at;
--   2. Auth Admin API (na action): limpa user_metadata, bane e faz soft delete
--      (auth.users.deleted_at; email/telefone ofuscados; senha, identidades e
--      sessões removidas). A linha de auth.users fica só como chave pseudônima
--      de orders/payment_events/enrollments.
-- orders e payment_events NÃO são alterados (obrigação legal/fiscal).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles.deleted_at
-- -----------------------------------------------------------------------------
alter table public.profiles add column deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Quando o titular excluiu a conta (DB-008). Preenchido só por anonymize_user(); perfil anonimizado não aceita mais edição pelo usuário.';

-- Perfil excluído não volta a receber dados pessoais (o access token já emitido
-- continua válido até expirar; esta policy fecha a janela de edição).
drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()) and deleted_at is null);

-- -----------------------------------------------------------------------------
-- anonymize_user
-- -----------------------------------------------------------------------------
-- Resultados (text):
--   anonymized          perfil anonimizado agora
--   already_anonymized  já estava (a limpeza é refeita: idempotente)
--   not_found           usuário/perfil inexistente
--   is_admin            admin não usa este fluxo (remover o papel antes, via SQL)
--   refund_pending      pedido com reembolso solicitado e ainda não concluído
--   payment_pending     cobrança PIX em aberto (pode ser paga e gerar matrícula)
create function public.anonymize_user(p_user_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted_at timestamptz;
begin
  if p_user_id is null then
    return 'not_found';
  end if;

  -- Trava o perfil (serializa chamadas concorrentes para o mesmo usuário).
  select p.deleted_at into v_deleted_at
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if exists (
    select 1 from public.user_roles r
    where r.user_id = p_user_id and r.role = 'admin'
  ) then
    return 'is_admin';
  end if;

  -- Trava os pedidos do usuário: request_refund/fulfill_order (que fazem
  -- SELECT ... FOR UPDATE no pedido) esperam esta transação terminar.
  perform 1 from public.orders o where o.user_id = p_user_id for update;

  if exists (
    select 1 from public.orders o
    where o.user_id = p_user_id
      and o.refund_requested_at is not null
      and o.refunded_at is null
      and o.status = 'paid'
  ) then
    return 'refund_pending';
  end if;

  if exists (
    select 1 from public.orders o
    where o.user_id = p_user_id
      and o.status = 'pending'
      and o.provider_billing_id is not null
      and (o.expires_at is null or o.expires_at > pg_catalog.now())
  ) then
    return 'payment_pending';
  end if;

  update public.profiles p
     set full_name  = 'Conta excluída',
         tax_id     = null,
         phone      = null,
         avatar_url = null,
         deleted_at = coalesce(p.deleted_at, pg_catalog.now())
   where p.id = p_user_id;

  -- Revogação lógica (histórico preservado). revoked_by = o próprio titular.
  update public.enrollments e
     set revoked_at = pg_catalog.now(),
         revoked_by = p_user_id,
         revoke_reason = 'account_deleted'
   where e.user_id = p_user_id
     and e.revoked_at is null;

  delete from public.lesson_progress lp where lp.user_id = p_user_id;

  return case when v_deleted_at is null then 'anonymized' else 'already_anonymized' end;
end;
$$;

comment on function public.anonymize_user(uuid) is
  'DB-008 (service role): exclusão de conta pelo titular. Anonimiza profiles (nome -> ''Conta excluída'', CPF/telefone/avatar nulos, deleted_at), revoga matrículas ativas (revoke_reason=''account_deleted''), apaga lesson_progress. Preserva orders/payment_events. Idempotente. Retorna anonymized | already_anonymized | not_found | is_admin | refund_pending | payment_pending.';

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
