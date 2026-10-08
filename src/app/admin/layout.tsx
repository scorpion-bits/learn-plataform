import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';
import { AdminShell } from '@/components/layout';
import { getCurrentProfile, requireAdmin } from '@/lib/auth/dal';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Anônimo -> /entrar; logado não-admin -> 404. Cada Server Action repete o guard.
  const user = await requireAdmin();
  const profile = await getCurrentProfile();
  return (
    <>
      <IsoBackdrop variant="subtle" />
      <AdminShell user={{ name: profile?.fullName ?? user.email, email: user.email }}>
        {children}
      </AdminShell>
    </>
  );
}
