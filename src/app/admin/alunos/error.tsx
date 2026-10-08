'use client';

import { ErrorState } from '@/components/ui';

export default function StudentsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar os alunos. Tente novamente." onRetry={reset} />
  );
}
