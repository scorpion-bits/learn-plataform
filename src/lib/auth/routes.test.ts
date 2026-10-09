import { describe, expect, it } from 'vitest';

import { isGuestOnlyPath, isProtectedPath, resolveAuthRedirect } from './routes';

describe('isProtectedPath', () => {
  it.each([
    '/inicio',
    '/minha-biblioteca',
    '/aprender/godot/aula-1',
    '/conta',
    '/checkout/123',
    '/admin',
    '/admin/cursos',
  ])('protege %s', (path) => expect(isProtectedPath(path)).toBe(true));

  it.each(['/', '/cursos', '/cursos/godot', '/entrar', '/administrador', '/contato', '/inicios'])(
    'não protege %s',
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});

describe('isGuestOnlyPath', () => {
  it('cobre só /entrar e /cadastro', () => {
    expect(isGuestOnlyPath('/entrar')).toBe(true);
    expect(isGuestOnlyPath('/cadastro')).toBe(true);
    expect(isGuestOnlyPath('/recuperar-senha')).toBe(false);
    expect(isGuestOnlyPath('/redefinir-senha')).toBe(false);
  });
});

describe('resolveAuthRedirect', () => {
  it('anônimo em rota protegida vai para /entrar com next', () => {
    expect(
      resolveAuthRedirect({ pathname: '/admin/cursos', search: '?p=2', isAuthenticated: false }),
    ).toBe(`/entrar?next=${encodeURIComponent('/admin/cursos?p=2')}`);
  });

  it('anônimo em rota pública passa', () => {
    expect(
      resolveAuthRedirect({ pathname: '/cursos', search: '', isAuthenticated: false }),
    ).toBeNull();
    expect(
      resolveAuthRedirect({ pathname: '/entrar', search: '', isAuthenticated: false }),
    ).toBeNull();
  });

  it('logado em /entrar e /cadastro vai para /inicio', () => {
    expect(resolveAuthRedirect({ pathname: '/entrar', search: '', isAuthenticated: true })).toBe(
      '/inicio',
    );
    expect(resolveAuthRedirect({ pathname: '/cadastro', search: '', isAuthenticated: true })).toBe(
      '/inicio',
    );
  });

  it('logado em /entrar respeita next seguro e ignora malicioso', () => {
    expect(
      resolveAuthRedirect({
        pathname: '/entrar',
        search: '?next=/checkout/1',
        isAuthenticated: true,
      }),
    ).toBe('/checkout/1');
    expect(
      resolveAuthRedirect({
        pathname: '/entrar',
        search: '?next=//evil.com',
        isAuthenticated: true,
      }),
    ).toBe('/inicio');
  });

  it('logado em rota protegida ou recuperação de senha passa', () => {
    expect(
      resolveAuthRedirect({ pathname: '/inicio', search: '', isAuthenticated: true }),
    ).toBeNull();
    expect(
      resolveAuthRedirect({ pathname: '/redefinir-senha', search: '', isAuthenticated: true }),
    ).toBeNull();
  });
});

describe('resolveAuthRedirect — code na raiz', () => {
  it('encaminha ?code= da landing para o callback', () => {
    expect(
      resolveAuthRedirect({ pathname: '/', search: '?code=abc-123', isAuthenticated: false }),
    ).toBe('/auth/callback?code=abc-123&next=/inicio');
  });
  it('não mexe na landing sem code nem em outras rotas com code', () => {
    expect(resolveAuthRedirect({ pathname: '/', search: '', isAuthenticated: false })).toBeNull();
    expect(
      resolveAuthRedirect({ pathname: '/cursos', search: '?code=x', isAuthenticated: false }),
    ).toBeNull();
  });
});
