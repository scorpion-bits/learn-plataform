import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OrderStatusView } from '@/features/checkout/components/OrderStatusView';
import { getMyOrder } from '@/features/checkout/queries';

/*
 * Página do pedido (PAY-004): QR PIX, copia-e-cola e acompanhamento do status.
 * Confirma que o pedido é do aluno (RLS + filtro por user_id); nunca concede acesso.
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
