import type { ReactNode } from 'react';

import { IsoBackdrop } from '@/components/brand';

/** Vitrines de desenvolvimento (cada página dá 404 em produção). */
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IsoBackdrop variant="full" />
      {children}
    </>
  );
}
