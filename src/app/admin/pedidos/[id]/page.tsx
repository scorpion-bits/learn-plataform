import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OrderDetailView } from '@/features/orders/components/OrderDetailView';
import { getOrderDetail } from '@/features/orders/queries';

export const metadata: Metadata = { title: 'Pedido' };
export const dynamic = 'force-dynamic';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();
  return <OrderDetailView order={order} listPath="/admin/pedidos" />;
}
