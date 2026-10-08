import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';
import { requireUser } from '@/lib/auth/dal';

/**
 * Fundo da área do aluno. O chrome (StudentShell) vive em `(app)/layout.tsx`
 * para que o player (`/aprender/...`, PlayerShell) fique fora dele.
 *
 * `requireUser()` aqui cobre o player também. Layouts NÃO são re-renderizados em
 * navegação client-side, então páginas/actions/queries continuam checando (e a
 * RLS é a barreira final).
 */
export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <>
      <IsoBackdrop variant="full" />
      {children}
    </>
  );
}
