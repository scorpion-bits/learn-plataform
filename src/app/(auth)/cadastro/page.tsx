import type { Metadata } from 'next';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export const metadata: Metadata = { title: 'Criar conta' };

export default function CadastroPage() {
  return (
    <AuthCard title="Criar conta" lead="Comece a aprender a criar jogos.">
      <SignUpForm />
    </AuthCard>
  );
}
