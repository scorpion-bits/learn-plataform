import type { Metadata } from 'next';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { RecoverPasswordForm } from '@/features/auth/components/RecoverPasswordForm';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      lead="Informe seu email e enviaremos um link para criar uma nova senha."
    >
      <RecoverPasswordForm />
    </AuthCard>
  );
}
