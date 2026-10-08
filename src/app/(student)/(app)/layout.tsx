import type { ReactNode } from 'react';

import { StudentShell } from '@/components/layout';
import { devUser } from '@/components/layout/dev-user';

// TODO(AUTH-002): trocar `devUser` pelo usuário da sessão (requireUser()).
export default function StudentAppLayout({ children }: { children: ReactNode }) {
  return <StudentShell user={devUser()}>{children}</StudentShell>;
}
