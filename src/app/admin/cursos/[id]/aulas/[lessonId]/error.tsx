'use client';

import { ErrorState } from '@/components/ui';

export default function LessonMaterialsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      message="Não foi possível carregar os materiais desta aula. Tente novamente."
      onRetry={reset}
    />
  );
}
