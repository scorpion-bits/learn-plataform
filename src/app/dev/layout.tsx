import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { IsoBackdrop } from '@/components/brand';

/** Vitrines de desenvolvimento: 404 em produção (aqui e em cada página). */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <>
      <IsoBackdrop variant="full" />
      {children}
    </>
  );
}
