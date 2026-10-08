import type { Metadata } from 'next';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { TextLink } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/dal';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default async function RedefinirSenhaPage() {
  // A sessão vem do link do email (/auth/callback). Sem ela, não há o que redefinir.
  const user = await getCurrentUser();
  if (!user) {
    return (
      <AuthCard
        title="Link expirado"
        lead={
          <>
            Este link é inválido ou já foi usado.{' '}
            <TextLink href="/recuperar-senha">Peça um novo link</TextLink>.
          </>
        }
      >
        {null}
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Nova senha" lead="Escolha uma senha nova para sua conta.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
