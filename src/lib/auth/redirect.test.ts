import { describe, expect, it } from 'vitest';

import { DEFAULT_AFTER_LOGIN, sanitizeNextPath } from './redirect';

describe('sanitizeNextPath', () => {
  it.each([
    ['/inicio', '/inicio'],
    ['/aprender/godot/aula-1', '/aprender/godot/aula-1'],
    ['/checkout/abc?x=1#topo', '/checkout/abc?x=1#topo'],
    ['/cursos/godot%20do%20zero', '/cursos/godot%20do%20zero'],
    ['/admin/cursos?pagina=2', '/admin/cursos?pagina=2'],
    ['/a/../b', '/b'],
  ])('aceita path interno %s', (input, expected) => {
    expect(sanitizeNextPath(input)).toBe(expected);
  });

  it.each([
    ['//evil.com', 'protocol-relative'],
    ['///evil.com', 'protocol-relative triplo'],
    ['/\\evil.com', 'barra invertida'],
    ['\\\\evil.com', 'barras invertidas'],
    ['/\\/evil.com', 'barra invertida + barra'],
    ['https://evil.com', 'https'],
    ['http://evil.com/inicio', 'http'],
    ['HTTPS://evil.com', 'https maiúsculo'],
    ['javascript:alert(1)', 'javascript:'],
    ['JaVaScRiPt:alert(1)', 'javascript: misto'],
    ['data:text/html,<script>', 'data:'],
    ['evil.com', 'host sem esquema'],
    ['inicio', 'relativo sem barra'],
    ['%2F%2Fevil.com', '%2F%2F'],
    ['/%2Fevil.com', '/%2F'],
    ['%2f%2fevil.com', '%2f%2f minúsculo'],
    ['/%5Cevil.com', '%5C'],
    ['/%255Cevil.com', 'dupla codificação de \\'],
    ['/%252F%252Fevil.com', 'dupla codificação de //'],
    ['/%25252F', 'tripla codificação'],
    ['/\tevil.com', 'tab'],
    ['/\nevil.com', 'LF'],
    ['/%0d%0aSet-Cookie:x=1', 'CRLF codificado'],
    ['/%09/evil.com', 'tab codificado'],
    ['/\u0000x', 'NUL'],
    ['/ evil.com', 'espaço'],
    ['/ evil.com', 'NBSP'],
    ['/​/evil.com', 'zero-width'],
    ['/%E3%80%80x', 'espaço ideográfico codificado'],
    ['/%zz', '% malformado'],
    ['', 'vazio'],
    ['/' + 'a'.repeat(3000), 'longo demais'],
  ])('rejeita %j (%s)', (input) => {
    expect(sanitizeNextPath(input)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('rejeita tipos que não são string', () => {
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeNextPath(['/inicio'])).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('usa o fallback informado', () => {
    expect(sanitizeNextPath('//evil.com', '/minha-biblioteca')).toBe('/minha-biblioteca');
  });

  it('evita loop de login', () => {
    expect(sanitizeNextPath('/entrar')).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeNextPath('/cadastro?x=1')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('aceita /redefinir-senha (destino do link de recuperação)', () => {
    expect(sanitizeNextPath('/redefinir-senha')).toBe('/redefinir-senha');
  });

  it('rejeita escapes por normalização de ../', () => {
    expect(sanitizeNextPath('/..//evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeNextPath('/.//evil.com')).toBe(DEFAULT_AFTER_LOGIN);
  });
});
