import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OrderStatusView } from '@/features/checkout/components/OrderStatusView';
import { getMyOrder } from '@/features/checkout/queries';

/*
 * Placeholder (PAY-002): só confirma que o pedido é do aluno (RLS + filtro por
 * user_id) e mostra o status. QR, copia-e-cola e polling: PAY-004.
 * Pedido de outro usuário ou id inválido -> 404 (não revela existência).
 */

export const metadata: Metadata = {
  title: 'Seu pedido',
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderId: string }>;

export default async function OrderPage({ params }: { params: Params }) {
  const { orderId } = await params;
  const order = await getMyOrder(orderId);
  if (!order) notFound();
  return <OrderStatusView order={order} />;
}
