'use client';

import { RouteError } from '@/features/catalog/components/RouteError';

export default function MyOrdersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="Não foi possível carregar seus pedidos" />;
}
