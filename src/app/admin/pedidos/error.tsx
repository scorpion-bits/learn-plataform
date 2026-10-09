'use client';

import { ErrorState } from '@/components/ui';

export default function OrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar os pedidos. Tente novamente." onRetry={reset} />
  );
}
