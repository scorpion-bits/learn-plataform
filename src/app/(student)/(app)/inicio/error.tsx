'use client';

import { RouteError } from '@/features/catalog/components/RouteError';

export default function InicioError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="Não foi possível carregar seu início" />;
}
