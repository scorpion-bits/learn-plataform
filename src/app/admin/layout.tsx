import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';
import { AdminShell } from '@/components/layout';
import { devUser } from '@/components/layout/dev-user';

// TODO(AUTH-002): `await requireAdmin()` aqui e usuário real no shell.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IsoBackdrop variant="subtle" />
      <AdminShell user={devUser()}>{children}</AdminShell>
    </>
  );
}
