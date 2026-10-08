'use client';

import { ErrorState } from '@/components/ui';

export default function CourseError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar esta página. Tente novamente." onRetry={reset} />
  );
}
