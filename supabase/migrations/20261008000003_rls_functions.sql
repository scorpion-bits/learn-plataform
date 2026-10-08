-- =============================================================================
-- DB-003 — RLS, funções de segurança e trigger de cadastro
-- =============================================================================
-- Materializa docs/database.md §4–5 e a matriz de docs/authorization.md.
--
--   * Funções de autorização: is_admin(), has_course_access()
--   * Cadastro: handle_new_user() em auth.users (IGNORA metadata.role — ADR-005)
--   * Grants mínimos (tabela/coluna) + policies por papel
--   * Comércio: fulfill_order(), refund_order() (só service_role),
--     request_refund() (aluno), admin_record_manual_sale() (admin)
--   * Views security_invoker: course_catalog, course_outline, my_library
--   * admin_students() (função admin-only; não expõe auth.users a não-admins)
--   * reorder_modules/lessons/materials (security invoker, RLS de admin aplica)
--
-- Convenções:
--   * Toda função SECURITY DEFINER tem `set search_path = ''` e nomes qualificados.
--   * Toda função começa com `revoke all ... from public, anon, authenticated`
--     e recebe grants explícitos (o Supabase concede EXECUTE por padrão).
--   * auth.uid() / is_admin() em policies sempre dentro de `(select ...)`
--     para serem avaliados uma vez por consulta (initPlan), não por linha.
--   * Erros de regra de negócio em funções chamadas pelo app viram um código
--     de resultado (text) em vez de exceção, para a action mapear para pt-BR.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funções de autorização
-- -----------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'true se o usuário da sessão (auth.uid()) tem papel admin em user_roles. Nunca lê metadata/cookie (ADR-005).';

-- Acesso efetivo ao CONTEÚDO de um curso:
--   admin -> sempre;
--   aluno -> matrícula ativa (qualquer origem) E curso não está em rascunho
--            (published ou archived: quem comprou mantém acesso a curso arquivado).
-- Sem sessão (anon) -> false.
create function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_course_id is not null
    and (select auth.uid()) is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.enrollments e
        join public.courses c on c.id = e.course_id
        where e.user_id = (select auth.uid())
          and e.course_id = p_course_id
          and e.revoked_at is null
          and c.status <> 'draft'
      )
    );
$$;

comment on function public.has_course_access(uuid) is
  'true se o usuário da sessão pode consumir o conteúdo do curso: admin, ou matrícula ativa em curso published/archived. anon -> false.';

revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.has_course_access(uuid) from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.has_course_access(uuid) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Cadastro: profile + papel student (ignora qualquer papel vindo do client)
-- -----------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Apenas o nome é aproveitado do metadata (controlado pelo usuário):
  -- remove caracteres de controle, colapsa espaços e trunca em 120.
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '');
  v_name := pg_catalog.regexp_replace(v_name, '[[:cntrl:]]', ' ', 'g');
  v_name := pg_catalog.btrim(pg_catalog.regexp_replace(v_name, '\s+', ' ', 'g'));
  v_name := pg_catalog.left(v_name, 120);

  insert into public.profiles (id, full_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  -- Papel SEMPRE student. raw_user_meta_data.role / app_metadata são ignorados
  -- (corrige S1 do audit). Admin só via supabase/scripts/grant-admin.sql.
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger AFTER INSERT em auth.users: cria profile (só full_name sanitizado do metadata) e papel student. Ignora metadata.role (ADR-005).';

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. Ajustes de schema para o client
-- -----------------------------------------------------------------------------

-- O aluno não precisa (nem deve) informar o próprio id ao gravar progresso.
alter table public.lesson_progress alter column user_id set default auth.uid();

-- ADR-017: registrar quanto do curso foi consumido no pedido de reembolso
-- (visível ao admin; não limita o direito de arrependimento).
alter table public.orders
  add column refund_requested_progress smallint,
  add constraint orders_refund_requested_progress_check check (
    refund_requested_progress is null
    or (refund_requested_progress between 0 and 100 and refund_requested_at is not null)
  );

comment on column public.orders.refund_requested_progress is
  'Percentual de aulas concluídas no momento do pedido de reembolso (ADR-017). Informativo para o admin.';

-- -----------------------------------------------------------------------------
-- 4. Grants mínimos por tabela/coluna
-- -----------------------------------------------------------------------------
-- (DB-001/002 revogaram tudo de anon/authenticated; service_role mantém o
-- padrão do Supabase e ignora RLS.)

-- profiles: lê a própria linha (admin lê todas); atualiza só colunas pessoais.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, tax_id, phone) on public.profiles to authenticated;

-- user_roles: somente leitura. Escrita exclusiva de service role / SQL.
grant select on public.user_roles to authenticated;

-- Conteúdo: leitura pública filtrada por RLS; escrita só passa nas policies de admin.
grant select on public.categories, public.courses, public.course_modules,
                public.lessons, public.lesson_materials
  to anon, authenticated;
grant insert, update, delete on public.categories, public.courses, public.course_modules,
                public.lessons, public.lesson_materials
  to authenticated;

-- enrollments: aluno lê as próprias; admin concede (admin_grant) e revoga.
-- Sem DELETE: histórico de concessões é permanente (ADR-006).
grant select on public.enrollments to authenticated;
grant insert (user_id, course_id, source, granted_by) on public.enrollments to authenticated;
grant update (revoked_at, revoked_by, revoke_reason) on public.enrollments to authenticated;

-- orders / payment_events: somente leitura. Escrita via service role e funções.
grant select on public.orders to authenticated;
grant select on public.payment_events to authenticated;

-- lesson_progress: aluno grava o próprio progresso (upsert do PostgREST precisa
-- de UPDATE nas colunas do payload; a policy prende user_id e o acesso ao curso).
grant select, delete on public.lesson_progress to authenticated;
grant insert (user_id, lesson_id, completed_at, last_position_seconds) on public.lesson_progress to authenticated;
grant update (user_id, lesson_id, completed_at, last_position_seconds) on public.lesson_progress to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Policies
-- -----------------------------------------------------------------------------

-- profiles ---------------------------------------------------------------------
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_roles -------------------------------------------------------------------
create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- categories -------------------------------------------------------------------
create policy categories_select_all on public.categories
  for select to anon, authenticated
  using (true);

create policy categories_insert_admin on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy categories_update_admin on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_delete_admin on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- courses ----------------------------------------------------------------------
create policy courses_select_published_anon on public.courses
  for select to anon
  using (status = 'published');

-- published para todos; archived só para quem tem acesso; draft só admin
-- (has_course_access já inclui admin).
create policy courses_select_authenticated on public.courses
  for select to authenticated
  using (status = 'published' or public.has_course_access(id));

create policy courses_insert_admin on public.courses
  for insert to authenticated with check ((select public.is_admin()));
create policy courses_update_admin on public.courses
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy courses_delete_admin on public.courses
  for delete to authenticated using ((select public.is_admin()));

-- course_modules ---------------------------------------------------------------
create policy course_modules_select_anon on public.course_modules
  for select to anon
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));

create policy course_modules_select_authenticated on public.course_modules
  for select to authenticated
  using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    or public.has_course_access(course_id)
  );

create policy course_modules_insert_admin on public.course_modules
  for insert to authenticated with check ((select public.is_admin()));
create policy course_modules_update_admin on public.course_modules
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy course_modules_delete_admin on public.course_modules
  for delete to authenticated using ((select public.is_admin()));

-- lessons (metadados de ementa) ------------------------------------------------
create policy lessons_select_anon on public.lessons
  for select to anon
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));

create policy lessons_select_authenticated on public.lessons
  for select to authenticated
  using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    or public.has_course_access(course_id)
  );

create policy lessons_insert_admin on public.lessons
  for insert to authenticated with check ((select public.is_admin()));
create policy lessons_update_admin on public.lessons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy lessons_delete_admin on public.lessons
  for delete to authenticated using ((select public.is_admin()));

-- lesson_materials (conteúdo pago) ---------------------------------------------
-- anon: só materiais de aula preview de curso publicado.
create policy lesson_materials_select_preview_anon on public.lesson_materials
  for select to anon
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and l.is_preview and c.status = 'published'
    )
  );

-- authenticated: acesso ao curso (inclui admin) ou preview de curso publicado.
create policy lesson_materials_select_authenticated on public.lesson_materials
  for select to authenticated
  using (
    public.has_course_access(course_id)
    or exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and l.is_preview and c.status = 'published'
    )
  );

create policy lesson_materials_insert_admin on public.lesson_materials
  for insert to authenticated with check ((select public.is_admin()));
create policy lesson_materials_update_admin on public.lesson_materials
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy lesson_materials_delete_admin on public.lesson_materials
  for delete to authenticated using ((select public.is_admin()));

-- enrollments ------------------------------------------------------------------
create policy enrollments_select_own_or_admin on public.enrollments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Admin só concede admin_grant, assinando como ele mesmo. Compras entram
-- exclusivamente por fulfill_order()/admin_record_manual_sale().
create policy enrollments_insert_admin_grant on public.enrollments
  for insert to authenticated
  with check (
    (select public.is_admin())
    and source = 'admin_grant'
    and granted_by = (select auth.uid())
  );

-- Admin revoga assinando como ele mesmo (o trigger enrollments_guard só deixa
-- mudar de ativa para revogada; o GRANT só libera as colunas de revogação).
create policy enrollments_update_revoke_admin on public.enrollments
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and revoked_by = (select auth.uid()));

-- orders -----------------------------------------------------------------------
create policy orders_select_own_or_admin on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- payment_events ---------------------------------------------------------------
create policy payment_events_select_admin on public.payment_events
  for select to authenticated
  using ((select public.is_admin()));

-- lesson_progress --------------------------------------------------------------
-- Aluno: todas as operações nas próprias linhas, desde que tenha acesso ao curso.
-- (course_id é preenchido pelo trigger BEFORE, antes do WITH CHECK.)
create policy lesson_progress_select_own_or_admin on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy lesson_progress_insert_own on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_course_access(course_id));

create policy lesson_progress_update_own on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()) and public.has_course_access(course_id))
  with check (user_id = (select auth.uid()) and public.has_course_access(course_id));

create policy lesson_progress_delete_own on public.lesson_progress
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.has_course_access(course_id));

-- -----------------------------------------------------------------------------
-- 6. Comércio
-- -----------------------------------------------------------------------------

-- fulfill_order: chamado pelo webhook (service role) DEPOIS de verificar o
-- evento e reconsultar o provedor. Transação atômica e idempotente:
--   lock do pedido -> valida status/valor/cobrança -> paid -> matrícula purchase
--   -> marca o evento como processado.
-- Resultados:
--   fulfilled              pedido pago agora e matrícula criada
--   paid_already_enrolled  pedido pago agora, mas o aluno já tinha matrícula
--                          purchase ativa (pagamento em duplicidade: o admin
--                          deve reembolsar; evento fica com processing_error)
--   already_paid           reentrega/reprocessamento: nada a fazer
--   order_not_found | invalid_status | amount_mismatch | billing_mismatch
--                          nada é alterado no pedido; evento recebe processing_error
-- Aceita pending -> paid e expired -> paid (PIX pago após nossa expiração local:
-- o dinheiro entrou, o acesso é devido — docs/payments.md §5). failed/canceled/
-- refunded retornam invalid_status para tratamento manual.
create function public.fulfill_order(
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
  elsif v_order.status not in ('pending', 'expired') then
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
  'Webhook (service role): marca pedido pago e cria matrícula purchase de forma atômica e idempotente. Retorna fulfilled | paid_already_enrolled | already_paid | order_not_found | invalid_status | amount_mismatch | billing_mismatch.';

-- refund_order: reembolso confirmado pelo provedor (transparent.refunded) ou
-- disputa perdida (transparent.lost). paid -> refunded e revoga a matrícula
-- purchase do pedido com revoke_reason = 'refund' (ADR-017). Idempotente.
-- Resultados: refunded | already_refunded | order_not_found | invalid_status
create function public.refund_order(p_order_id uuid, p_event_id text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_result text;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    v_result := 'order_not_found';
  elsif v_order.status = 'refunded' then
    v_result := 'already_refunded';
  elsif v_order.status <> 'paid' then
    v_result := 'invalid_status';
  else
    update public.orders o
       set status = 'refunded',
           refunded_at = pg_catalog.now()
     where o.id = v_order.id;

    update public.enrollments e
       set revoked_at = pg_catalog.now(),
           revoked_by = null,
           revoke_reason = 'refund'
     where e.order_id = v_order.id
       and e.revoked_at is null;

    v_result := 'refunded';
  end if;

  if p_event_id is not null then
    update public.payment_events pe
       set order_id = coalesce(pe.order_id, v_order.id),
           processed_at = case when v_result in ('refunded', 'already_refunded') then pg_catalog.now() end,
           processing_error = case
             when v_result in ('refunded', 'already_refunded') then null
             else 'refund_order: ' || v_result
           end
     where pe.provider_event_id = p_event_id;
  end if;

  return v_result;
end;
$$;

comment on function public.refund_order(uuid, text) is
  'Webhook (service role): paid -> refunded e revoga a matrícula purchase do pedido (revoke_reason=refund). Idempotente. Retorna refunded | already_refunded | order_not_found | invalid_status.';

-- request_refund: o aluno pede reembolso do PRÓPRIO pedido (CDC art. 49).
-- Só registra o pedido (refund_requested_at + % consumido); o reembolso em si é
-- feito pelo admin/servidor no provedor e confirmado via refund_order().
-- Resultados:
--   requested | already_requested | already_refunded
--   not_found          pedido inexistente ou de outro usuário (não vaza existência)
--   not_paid           pedido não está pago
--   not_eligible       venda manual (tratada pelo suporte)
--   window_expired     passou de paid_at + 7 dias (depois disso, só decisão do admin)
--   previously_refunded antiabuso: já houve reembolso (ou pedido de reembolso) deste
--                       curso por este usuário em outro pedido (ADR-017)
create function public.request_refund(p_order_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_total integer;
  v_done integer;
  v_progress smallint;
begin
  if v_uid is null then
    return 'not_found';
  end if;

  select * into v_order
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_uid
  for update;

  if not found then
    return 'not_found';
  elsif v_order.status = 'refunded' then
    return 'already_refunded';
  elsif v_order.refund_requested_at is not null then
    return 'already_requested';
  elsif v_order.status <> 'paid' then
    return 'not_paid';
  elsif v_order.source <> 'checkout' then
    return 'not_eligible';
  elsif pg_catalog.now() > v_order.paid_at + interval '7 days' then
    return 'window_expired';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.user_id = v_uid
      and o.course_id = v_order.course_id
      and o.id <> v_order.id
      and (o.status = 'refunded' or o.refund_requested_at is not null)
  ) then
    return 'previously_refunded';
  end if;

  select pg_catalog.count(*)::integer into v_total
  from public.lessons l
  where l.course_id = v_order.course_id;

  select pg_catalog.count(*)::integer into v_done
  from public.lesson_progress lp
  where lp.user_id = v_uid
    and lp.course_id = v_order.course_id
    and lp.completed_at is not null;

  v_progress := case
    when v_total = 0 then 0
    else least(100, pg_catalog.round(100.0 * v_done / v_total))::smallint
  end;

  update public.orders o
     set refund_requested_at = pg_catalog.now(),
         refund_requested_progress = v_progress
   where o.id = v_order.id;

  return 'requested';
end;
$$;

comment on function public.request_refund(uuid) is
  'Aluno pede reembolso do próprio pedido pago em até 7 dias (CDC art. 49), com antiabuso por curso (ADR-017). Retorna requested | already_requested | already_refunded | not_found | not_paid | not_eligible | window_expired | previously_refunded.';

-- admin_record_manual_sale: venda registrada pelo admin (pagamento fora da
-- plataforma). Cria pedido manual 'paid' + matrícula purchase atomicamente.
-- Erros (exceções): 42501 sem permissão; P0002 curso inexistente;
-- 22023 curso não publicado / valor inválido; 23505 aluno já tem compra ativa.
create function public.admin_record_manual_sale(
  p_user_id uuid,
  p_course_id uuid,
  p_amount_cents integer default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_course public.courses%rowtype;
  v_amount integer;
  v_order_id uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'admin_record_manual_sale: permissão negada'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_course from public.courses c where c.id = p_course_id;
  if not found then
    raise exception 'admin_record_manual_sale: curso % não encontrado', p_course_id
      using errcode = 'no_data_found';
  end if;
  if v_course.status <> 'published' then
    raise exception 'admin_record_manual_sale: curso não está publicado'
      using errcode = 'invalid_parameter_value';
  end if;

  v_amount := coalesce(p_amount_cents, v_course.price_cents);
  if v_amount is null or v_amount <= 0 then
    raise exception 'admin_record_manual_sale: valor deve ser maior que zero'
      using errcode = 'invalid_parameter_value';
  end if;

  if exists (
    select 1 from public.enrollments e
    where e.user_id = p_user_id and e.course_id = p_course_id
      and e.source = 'purchase' and e.revoked_at is null
  ) then
    raise exception 'admin_record_manual_sale: aluno já possui matrícula por compra ativa neste curso'
      using errcode = 'unique_violation';
  end if;

  insert into public.orders (user_id, course_id, amount_cents, status, source, provider, created_by, paid_at)
  values (p_user_id, p_course_id, v_amount, 'paid', 'manual', 'manual', v_admin, pg_catalog.now())
  returning id into v_order_id;

  insert into public.enrollments (user_id, course_id, source, order_id)
  values (p_user_id, p_course_id, 'purchase', v_order_id);

  return v_order_id;
end;
$$;

comment on function public.admin_record_manual_sale(uuid, uuid, integer) is
  'Admin: registra venda manual (pedido manual pago + matrícula purchase) de forma atômica. Valor padrão = preço atual do curso.';

revoke all on function public.fulfill_order(uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.refund_order(uuid, text) from public, anon, authenticated;
revoke all on function public.request_refund(uuid) from public, anon, authenticated;
revoke all on function public.admin_record_manual_sale(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.fulfill_order(uuid, text, integer, text) to service_role;
grant execute on function public.refund_order(uuid, text) to service_role;
grant execute on function public.request_refund(uuid) to authenticated;
grant execute on function public.admin_record_manual_sale(uuid, uuid, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Reordenação (security invoker: as policies de admin se aplicam)
-- -----------------------------------------------------------------------------
-- Recebem a lista COMPLETA de ids na nova ordem; positions viram 0..n-1.
-- A unique (parent, position) é deferred, então o UPDATE em lote não colide.

create function public.reorder_modules(p_course_id uuid, p_module_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'reorder_modules: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  if p_module_ids is null
     or pg_catalog.cardinality(p_module_ids) <> (select pg_catalog.count(distinct x) from pg_catalog.unnest(p_module_ids) x)
     or pg_catalog.cardinality(p_module_ids) <> (select pg_catalog.count(*) from public.course_modules m where m.course_id = p_course_id) then
    raise exception 'reorder_modules: a lista deve conter todos os módulos do curso, sem repetição'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.course_modules m
     set position = t.ord - 1
    from pg_catalog.unnest(p_module_ids) with ordinality as t(id, ord)
   where m.id = t.id
     and m.course_id = p_course_id;
  get diagnostics v_count = row_count;

  if v_count <> pg_catalog.cardinality(p_module_ids) then
    raise exception 'reorder_modules: ids não pertencem ao curso' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

create function public.reorder_lessons(p_module_id uuid, p_lesson_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'reorder_lessons: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  if p_lesson_ids is null
     or pg_catalog.cardinality(p_lesson_ids) <> (select pg_catalog.count(distinct x) from pg_catalog.unnest(p_lesson_ids) x)
     or pg_catalog.cardinality(p_lesson_ids) <> (select pg_catalog.count(*) from public.lessons l where l.module_id = p_module_id) then
    raise exception 'reorder_lessons: a lista deve conter todas as aulas do módulo, sem repetição'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.lessons l
     set position = t.ord - 1
    from pg_catalog.unnest(p_lesson_ids) with ordinality as t(id, ord)
   where l.id = t.id
     and l.module_id = p_module_id;
  get diagnostics v_count = row_count;

  if v_count <> pg_catalog.cardinality(p_lesson_ids) then
    raise exception 'reorder_lessons: ids não pertencem ao módulo' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

create function public.reorder_materials(p_lesson_id uuid, p_material_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'reorder_materials: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  if p_material_ids is null
     or pg_catalog.cardinality(p_material_ids) <> (select pg_catalog.count(distinct x) from pg_catalog.unnest(p_material_ids) x)
     or pg_catalog.cardinality(p_material_ids) <> (select pg_catalog.count(*) from public.lesson_materials lm where lm.lesson_id = p_lesson_id) then
    raise exception 'reorder_materials: a lista deve conter todos os materiais da aula, sem repetição'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.lesson_materials lm
     set position = t.ord - 1
    from pg_catalog.unnest(p_material_ids) with ordinality as t(id, ord)
   where lm.id = t.id
     and lm.lesson_id = p_lesson_id;
  get diagnostics v_count = row_count;

  if v_count <> pg_catalog.cardinality(p_material_ids) then
    raise exception 'reorder_materials: ids não pertencem à aula' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

comment on function public.reorder_modules(uuid, uuid[]) is 'Admin: reordena todos os módulos do curso (positions 0..n-1) atomicamente.';
comment on function public.reorder_lessons(uuid, uuid[]) is 'Admin: reordena todas as aulas do módulo (positions 0..n-1) atomicamente.';
comment on function public.reorder_materials(uuid, uuid[]) is 'Admin: reordena todos os materiais da aula (positions 0..n-1) atomicamente.';

revoke all on function public.reorder_modules(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_lessons(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_materials(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_modules(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_lessons(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_materials(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Admin: alunos (substitui a view admin_students; precisa de auth.users.email)
-- -----------------------------------------------------------------------------
create function public.admin_students(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz,
  active_enrollments bigint,
  total_spent_cents bigint,
  last_order_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(pg_catalog.btrim(p_search), '');
begin
  if not public.is_admin() then
    raise exception 'admin_students: permissão negada' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin'),
    p.created_at,
    (select pg_catalog.count(distinct e.course_id) from public.enrollments e
      where e.user_id = p.id and e.revoked_at is null),
    (select coalesce(pg_catalog.sum(o.amount_cents), 0)::bigint from public.orders o
      where o.user_id = p.id and o.status = 'paid'),
    (select pg_catalog.max(o.created_at) from public.orders o where o.user_id = p.id),
    pg_catalog.count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  where v_search is null
     -- strpos: busca literal (sem curingas de LIKE vindos do input)
     or pg_catalog.strpos(pg_catalog.lower(u.email::text), pg_catalog.lower(v_search)) > 0
     or pg_catalog.strpos(pg_catalog.lower(p.full_name), pg_catalog.lower(v_search)) > 0
  order by p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_students(text, integer, integer) is
  'Admin: lista paginada de alunos com email (auth.users), matrículas ativas, total gasto (pedidos paid) e total_count. Erro 42501 para não-admin.';

revoke all on function public.admin_students(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_students(text, integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Views (security_invoker: a RLS de quem consulta se aplica)
-- -----------------------------------------------------------------------------

-- Catálogo público: somente cursos publicados (mesmo para admin).
create view public.course_catalog
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.title,
  c.subtitle,
  c.description,
  c.cover_path,
  c.level,
  c.price_cents,
  c.published_at,
  c.estimated_minutes,
  c.category_id,
  cat.slug as category_slug,
  cat.name as category_name,
  cat.position as category_position,
  coalesce(mc.module_count, 0) as module_count,
  coalesce(ls.lesson_count, 0) as lesson_count,
  coalesce(ls.total_duration_seconds, 0) as total_duration_seconds
from public.courses c
left join public.categories cat on cat.id = c.category_id
left join lateral (
  select count(*) as module_count
  from public.course_modules m
  where m.course_id = c.id
) mc on true
left join lateral (
  select count(*) as lesson_count,
         sum(coalesce(l.duration_seconds, 0))::bigint as total_duration_seconds
  from public.lessons l
  where l.course_id = c.id
) ls on true
where c.status = 'published';

comment on view public.course_catalog is
  'Catálogo: cursos publicados + categoria + contagens e duração total. security_invoker.';

-- Ementa: módulos e aulas (sem conteúdo). A RLS decide quais cursos aparecem:
-- anon/sem acesso -> publicados; com acesso -> também arquivados; admin -> todos.
create view public.course_outline
with (security_invoker = true)
as
select
  m.course_id,
  m.id as module_id,
  m.title as module_title,
  m.position as module_position,
  l.id as lesson_id,
  l.title as lesson_title,
  l.summary as lesson_summary,
  l.position as lesson_position,
  l.duration_seconds,
  l.is_preview
from public.course_modules m
left join public.lessons l on l.module_id = m.id;

comment on view public.course_outline is
  'Ementa (módulos/aulas: títulos, duração, is_preview), uma linha por aula. Ordenar por module_position, lesson_position. security_invoker.';

-- Biblioteca do usuário da sessão: uma linha por curso com acesso ativo.
create view public.my_library
with (security_invoker = true)
as
select
  c.id as course_id,
  c.slug,
  c.title,
  c.subtitle,
  c.cover_path,
  c.level,
  c.status as course_status,
  e.sources,
  e.has_purchase,
  e.has_admin_grant,
  e.first_granted_at,
  coalesce(lc.lesson_count, 0) as lesson_count,
  coalesce(pr.completed_count, 0) as completed_count,
  case
    when coalesce(lc.lesson_count, 0) = 0 then 0
    else least(100, round(100.0 * coalesce(pr.completed_count, 0) / lc.lesson_count))::integer
  end as progress_percent,
  (coalesce(lc.lesson_count, 0) > 0 and coalesce(pr.completed_count, 0) >= lc.lesson_count) as is_completed,
  pr.last_accessed_at,
  pr.last_lesson_id
from (
  select
    en.course_id,
    array_agg(distinct en.source order by en.source) as sources,
    bool_or(en.source = 'purchase') as has_purchase,
    bool_or(en.source = 'admin_grant') as has_admin_grant,
    min(en.granted_at) as first_granted_at
  from public.enrollments en
  where en.user_id = (select auth.uid())
    and en.revoked_at is null
  group by en.course_id
) e
join public.courses c on c.id = e.course_id
left join lateral (
  select count(*) as lesson_count
  from public.lessons l
  where l.course_id = c.id
) lc on true
left join lateral (
  select
    count(*) filter (where lp.completed_at is not null) as completed_count,
    max(lp.updated_at) as last_accessed_at,
    (array_agg(lp.lesson_id order by lp.updated_at desc))[1] as last_lesson_id
  from public.lesson_progress lp
  where lp.user_id = (select auth.uid())
    and lp.course_id = c.id
) pr on true;

comment on view public.my_library is
  'Biblioteca do usuário da sessão: cursos com matrícula ativa, origens (Comprado/Atribuído), progresso agregado e último acesso ("continuar"). security_invoker.';

revoke all on public.course_catalog, public.course_outline, public.my_library from public, anon, authenticated;
grant select on public.course_catalog, public.course_outline to anon, authenticated;
grant select on public.my_library to authenticated;
