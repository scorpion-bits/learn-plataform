import { unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';
import { PublicShell } from '@/components/layout';
import type { ShellUser } from '@/components/layout';
import { getCurrentUser } from '@/lib/auth/dal';

/**
 * O shell público só precisa saber SE há sessão (troca "Entrar/Criar conta" por
 * "Minha biblioteca"), então usa `getCurrentUser()` (valida o JWT, sem consulta
 * ao banco). Isso torna as rotas públicas dinâmicas (leem cookies). Qualquer
 * falha vira "visitante": é UX, não autorização — o conteúdo é público e a RLS
 * limita o que cada query devolve.
 */
async function publicShellUser(): Promise<ShellUser | null> {
  try {
    const user = await getCurrentUser();
    return user ? { name: user.email, email: user.email } : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const user = await publicShellUser();
  return (
    <>
      <IsoBackdrop variant="full" />
      <PublicShell user={user}>{children}</PublicShell>
    </>
  );
}
