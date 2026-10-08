'use client';

import { ErrorState } from '@/components/ui';

export default function CoursesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar os cursos. Tente novamente." onRetry={reset} />
  );
}
