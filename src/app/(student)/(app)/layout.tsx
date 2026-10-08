import type { ReactNode } from 'react';

import { StudentShell } from '@/components/layout';
import { getCurrentProfile, getCurrentRole, requireUser } from '@/lib/auth/dal';

export default async function StudentAppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, role] = await Promise.all([getCurrentProfile(), getCurrentRole()]);
  return (
    <StudentShell
      user={{ name: profile?.fullName ?? user.email, email: user.email }}
      isAdmin={role === 'admin'} // só UX (link "Painel admin"); a autorização mora no banco
    >
      {children}
    </StudentShell>
  );
}
