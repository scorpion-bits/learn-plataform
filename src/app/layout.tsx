import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Scorpion Bits Learn',
    template: '%s · Scorpion Bits Learn',
  },
  description: 'Plataforma de cursos da Scorpion Bits — aprenda desenvolvimento de jogos.',
};

export const viewport: Viewport = {
  themeColor: '#05090f',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
