'use client';

import dynamic from 'next/dynamic';

/**
 * O formulário de material arrasta zod + upload (supabase-js) e fica abaixo
 * da dobra no editor da aula: carrega depois da hidratação, em chunk próprio.
 */
export const LazyMaterialForm = dynamic(
  () => import('./MaterialForm').then((m) => m.MaterialForm),
  {
    ssr: false,
    loading: () => <div aria-busy="true" style={{ minHeight: '14rem' }} />,
  },
);
