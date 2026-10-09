import type { Metadata } from 'next';

import { OrdersFilters, OrdersList, OrdersSearch } from '@/features/orders/components/OrdersList';
import { ManualSaleForm } from '@/features/orders/components/OrderActions';
import styles from '@/features/orders/components/Orders.module.css';
import { listOrders, listSellableCourses } from '@/features/orders/queries';
import { parseOrderListParams } from '@/features/orders/schemas';

export const metadata: Metadata = { title: 'Pedidos' };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseOrderListParams(await searchParams);
  const [{ rows, total }, courses] = await Promise.all([listOrders(params), listSellableCourses()]);
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Pedidos</h1>
        <ManualSaleForm courses={courses} />
      </div>
      <OrdersSearch basePath="/admin/pedidos" params={params} />
      <OrdersFilters basePath="/admin/pedidos" params={params} />
      <OrdersList rows={rows} total={total} params={params} basePath="/admin/pedidos" />
    </div>
  );
}
