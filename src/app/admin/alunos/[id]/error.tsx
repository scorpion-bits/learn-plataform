'use client';

import { ErrorState } from '@/components/ui';

export default function StudentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState message="Não foi possível carregar o aluno. Tente novamente." onRetry={reset} />
  );
}
