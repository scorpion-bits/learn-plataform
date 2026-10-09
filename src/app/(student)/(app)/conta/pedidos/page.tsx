import type { Metadata } from 'next';

import { MyOrdersView } from '@/features/orders/components/MyOrdersView';
import { listMyOrders } from '@/features/orders/queries';
import { requireUser } from '@/lib/auth/dal';

export const metadata: Metadata = { title: 'Meus pedidos' };
export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const user = await requireUser();
  const orders = await listMyOrders(user.id);
  // eslint-disable-next-line react-hooks/purity -- Server Component: renderiza uma vez por request
  return <MyOrdersView orders={orders} now={Date.now()} />;
}
