'use client';

import { ErrorState } from '@/components/ui';

export default function OrderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar os o pedido. Tente novamente." onRetry={reset} />
  );
}
