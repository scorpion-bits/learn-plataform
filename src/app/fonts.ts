import localFont from 'next/font/local';

/**
 * Fontes self-hosted (zero requisições a Google Fonts/CDN). Subset latin
 * (cobre todo o português); woff2 vindos do site da marca.
 * next/font injeta @font-face com `font-display: swap`, faz preload e gera
 * um fallback com métricas ajustadas (CLS ~0).
 *
 * As CSS variables são consumidas por --font-display / --font-body em
 * src/styles/tokens.css. Aplicadas no <html> em src/app/layout.tsx.
 */
export const grotesk = localFont({
  src: './fonts/grotesk-latin.woff2',
  weight: '300 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-grotesk',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

export const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
});
