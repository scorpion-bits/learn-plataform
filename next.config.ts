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
};

export default nextConfig;
