import type { MetadataRoute } from 'next';

// PWA instalável (ADR-019). Sem service worker no MVP: o app abre online.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scorpion Bits Learn',
    short_name: 'SB Learn',
    description: 'Plataforma de cursos da Scorpion Bits — aprenda desenvolvimento de jogos.',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#05090f', // = --ink-950
    theme_color: '#05090f',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
