-- =============================================================================
-- DB-006 — Métricas do admin (alimentam o dashboard, ADMIN-001)
--
--   * admin_dashboard_metrics(p_from, p_to)  -> uma linha de KPIs
--   * admin_revenue_by_day(p_from, p_to)     -> série diária (fuso America/Sao_Paulo)
--   * admin_top_courses(p_from, p_to, p_limit)
--
-- Convenções (docs/database.md §4):
--   * security definer + set search_path = '' + stable; is_admin() ou 42501.
--   * revoke all ... from public, anon, authenticated; grant só a authenticated.
--   * Intervalo [p_from, p_to) (p_to exclusivo), p_to > p_from, máx. 366 dias,
--     senão 22023.
--
-- Definições:
--   * venda  = pedido com paid_at no período e status paid OU refunded
--     (um pedido reembolsado foi pago; o estorno é descontado à parte).
--   * estorno = pedido refunded com refunded_at no período.
--   * receita = soma das vendas - soma dos estornos (pode ser negativa no dia).
--   * inclui vendas manuais (orders.source = 'manual').
-- =============================================================================

-- Estornos por período (as vendas já usam orders_paid_at_idx).
create index orders_refunded_at_idx on public.orders (refunded_at) where refunded_at is not null;

-- Validação comum do intervalo.
create function public.admin_metrics_check_range(p_from timestamptz, p_to timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'admin_metrics: intervalo inválido (p_to deve ser maior que p_from)' using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > interval '366 days' then
    raise exception 'admin_metrics: intervalo máximo de 366 dias' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

revoke all on function public.admin_metrics_check_range(timestamptz, timestamptz) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- KPIs
-- -----------------------------------------------------------------------------
create function public.admin_dashboard_metrics(p_from timestamptz, p_to timestamptz)
returns table (
  revenue_cents bigint,
  sales_count bigint,
  avg_ticket_cents bigint,
  students_total bigint,
  students_new bigint,
  enrollments_purchase bigint,
  enrollments_admin_grant bigint,
  refunds_count bigint,
  pending_refund_requests bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_gross bigint;
  v_sales bigint;
  v_refund_sum bigint;
  v_refunds bigint;
begin
  if not public.is_admin() then
    raise exception 'admin_dashboard_metrics: permissão negada' using errcode = 'insufficient_privilege';
  end if;
  perform public.admin_metrics_check_range(p_from, p_to);

  select coalesce(pg_catalog.sum(o.amount_cents), 0)::bigint, pg_catalog.count(*)
    into v_gross, v_sales
    from public.orders o
   where o.status in ('paid', 'refunded')
     and o.paid_at >= p_from and o.paid_at < p_to;

  select coalesce(pg_catalog.sum(o.amount_cents), 0)::bigint, pg_catalog.count(*)
    into v_refund_sum, v_refunds
    from public.orders o
   where o.status = 'refunded'
     and o.refunded_at >= p_from and o.refunded_at < p_to;

  return query
  select
    v_gross - v_refund_sum,
    v_sales,
    -- ticket médio das vendas brutas do período (0 sem vendas)
    case when v_sales = 0 then 0::bigint else pg_catalog.round(v_gross::numeric / v_sales)::bigint end,
    -- alunos = perfis sem papel admin
    (select pg_catalog.count(*) from public.profiles p
      where not exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin')),
    (select pg_catalog.count(*) from public.profiles p
      where p.created_at >= p_from and p.created_at < p_to
        and not exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin')),
    -- matrículas concedidas no período e ainda ativas (compra reembolsada sai)
    (select pg_catalog.count(*) from public.enrollments e
      where e.source = 'purchase' and e.revoked_at is null
        and e.granted_at >= p_from and e.granted_at < p_to),
    (select pg_catalog.count(*) from public.enrollments e
      where e.source = 'admin_grant' and e.revoked_at is null
        and e.granted_at >= p_from and e.granted_at < p_to),
    v_refunds,
    -- fila atual (independe do período): pediu reembolso e ainda está paid
    (select pg_catalog.count(*) from public.orders o
      where o.status = 'paid' and o.refund_requested_at is not null);
end;
$$;

comment on function public.admin_dashboard_metrics(timestamptz, timestamptz) is
  'Admin: KPIs do período [p_from, p_to). Receita = vendas (paid/refunded por paid_at) - estornos (refunded_at). 42501 não-admin; 22023 intervalo inválido (>366 dias).';

-- -----------------------------------------------------------------------------
-- Receita por dia (America/Sao_Paulo), dias sem venda preenchidos
-- -----------------------------------------------------------------------------
create function public.admin_revenue_by_day(p_from timestamptz, p_to timestamptz)
returns table (day date, revenue_cents bigint, sales integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_revenue_by_day: permissão negada' using errcode = 'insufficient_privilege';
  end if;
  perform public.admin_metrics_check_range(p_from, p_to);

  return query
  with ev as (
    select (o.paid_at at time zone 'America/Sao_Paulo')::date as d,
           o.amount_cents::bigint as cents, 1 as sale
      from public.orders o
     where o.status in ('paid', 'refunded')
       and o.paid_at >= p_from and o.paid_at < p_to
    union all
    select (o.refunded_at at time zone 'America/Sao_Paulo')::date,
           -o.amount_cents::bigint, 0
      from public.orders o
     where o.status = 'refunded'
       and o.refunded_at >= p_from and o.refunded_at < p_to
  ),
  agg as (
    select ev.d, pg_catalog.sum(ev.cents)::bigint as cents, pg_catalog.sum(ev.sale)::integer as sales
      from ev group by ev.d
  )
  select s.d::date,
         coalesce(agg.cents, 0)::bigint,
         coalesce(agg.sales, 0)::integer
    from pg_catalog.generate_series(
           (p_from at time zone 'America/Sao_Paulo')::date,
           ((p_to - interval '1 microsecond') at time zone 'America/Sao_Paulo')::date,
           interval '1 day') as s(d)
    left join agg on agg.d = s.d::date
   order by 1;
end;
$$;

comment on function public.admin_revenue_by_day(timestamptz, timestamptz) is
  'Admin: receita líquida e nº de vendas por dia (America/Sao_Paulo) em [p_from, p_to), com dias vazios = 0. Soma dos dias = revenue_cents de admin_dashboard_metrics.';

-- -----------------------------------------------------------------------------
-- Top cursos
-- -----------------------------------------------------------------------------
create function public.admin_top_courses(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 5
)
returns table (
  course_id uuid,
  slug text,
  title text,
  sales bigint,
  revenue_cents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_top_courses: permissão negada' using errcode = 'insufficient_privilege';
  end if;
  perform public.admin_metrics_check_range(p_from, p_to);

  return query
  with ev as (
    select o.course_id as cid, o.amount_cents::bigint as cents, 1 as sale
      from public.orders o
     where o.status in ('paid', 'refunded')
       and o.paid_at >= p_from and o.paid_at < p_to
    union all
    select o.course_id, -o.amount_cents::bigint, 0
      from public.orders o
     where o.status = 'refunded'
       and o.refunded_at >= p_from and o.refunded_at < p_to
  )
  select c.id, c.slug, c.title,
         pg_catalog.sum(ev.sale)::bigint,
         pg_catalog.sum(ev.cents)::bigint
    from ev
    join public.courses c on c.id = ev.cid
   group by c.id, c.slug, c.title
   order by 5 desc, 4 desc, c.title, c.id
   limit least(greatest(coalesce(p_limit, 5), 1), 50);
end;
$$;

comment on function public.admin_top_courses(timestamptz, timestamptz, integer) is
  'Admin: cursos por receita líquida no período (vendas = paid/refunded por paid_at; estornos descontados). limit 1–50.';

revoke all on function public.admin_dashboard_metrics(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_revenue_by_day(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_top_courses(timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_revenue_by_day(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_top_courses(timestamptz, timestamptz, integer) to authenticated;
