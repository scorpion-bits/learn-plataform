'use client';

import { RouteError } from '@/features/catalog/components/RouteError';

export default function CheckoutError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="Não foi possível abrir o pagamento" />;
}
