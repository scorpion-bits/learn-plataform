import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';

/**
 * Fundo da área do aluno. O chrome (StudentShell) vive em `(app)/layout.tsx`
 * para que o player (`/aprender/...`, PlayerShell) fique fora dele.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IsoBackdrop variant="full" />
      {children}
    </>
  );
}
