import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';
import { PublicShell } from '@/components/layout';

// TODO(AUTH-002): passar o usuário da sessão para `PublicShell`.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IsoBackdrop variant="full" />
      <PublicShell user={null}>{children}</PublicShell>
    </>
  );
}
