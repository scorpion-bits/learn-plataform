import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateSession = vi.fn();
vi.mock('@/lib/supabase/proxy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/proxy')>()),
  updateSession: (request: NextRequest) => updateSession(request),
}));

import { proxy } from './proxy';

function session(isAuthenticated: boolean) {
  const response = NextResponse.next();
  response.cookies.set('sb-refreshed', 'novo-token');
  updateSession.mockResolvedValue({ response, isAuthenticated });
  return response;
}

const req = (path: string) => new NextRequest(new URL(path, 'http://localhost:3000'));

beforeEach(() => vi.clearAllMocks());

describe('proxy', () => {
  it('anônimo em /admin -> /entrar?next=, preservando cookies renovados', async () => {
    session(false);
    const res = await proxy(req('/admin/cursos?p=2'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `http://localhost:3000/entrar?next=${encodeURIComponent('/admin/cursos?p=2')}`,
    );
    expect(res.cookies.get('sb-refreshed')?.value).toBe('novo-token');
  });

  it.each(['/inicio', '/minha-biblioteca', '/aprender/x', '/conta', '/checkout/1'])(
    'anônimo em %s é redirecionado',
    async (path) => {
      session(false);
      const res = await proxy(req(path));
      expect(res.headers.get('location')).toContain('/entrar?next=');
    },
  );

  it('logado em /entrar -> /inicio', async () => {
    session(true);
    const res = await proxy(req('/entrar'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/inicio');
  });

  it('rotas públicas e logado em área protegida passam', async () => {
    const anon = session(false);
    expect(await proxy(req('/cursos'))).toBe(anon);
    const logged = session(true);
    expect(await proxy(req('/admin'))).toBe(logged);
  });
});
