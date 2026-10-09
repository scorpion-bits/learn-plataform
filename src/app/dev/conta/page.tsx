import type { Metadata } from 'next';

import { AccountView } from '@/features/account/components/AccountView';

export const metadata: Metadata = {
  title: 'Vitrine · minha conta',
  robots: { index: false, follow: false },
};

export default function DevAccountPage() {
  return (
    <main id="conteudo">
      <AccountView
        demo
        isAdmin
        email="ana@exemplo.com"
        profile={{ fullName: 'Ana Souza', phone: '11940028922', taxId: '11144477735' }}
      />
    </main>
  );
}
