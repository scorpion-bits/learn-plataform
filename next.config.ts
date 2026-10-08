import type { NextConfig } from 'next';

/** Host do Supabase Storage (capas públicas). Sem env (ex.: build de CI), não libera nenhum host. */
function supabaseImagePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol === 'http:' ? 'http' : 'https',
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: '/storage/v1/object/public/**',
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: supabaseImagePatterns() },
  async headers() {
    const noStore = [{ key: 'Cache-Control', value: 'private, no-store' }];
    const privateRoutes = [
      '/aprender',
      '/inicio',
      '/minha-biblioteca',
      '/conta',
      '/checkout',
      '/admin',
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Conteúdo pessoal/pago nunca em cache compartilhado (CLAUDE.md, segurança #7).
      ...privateRoutes.flatMap((route) => [
        { source: route, headers: noStore },
        { source: `${route}/:path*`, headers: noStore },
      ]),
    ];
  },
};

export default nextConfig;
