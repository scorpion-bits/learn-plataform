import { expect } from '@playwright/test';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';

import type { TestUser } from './service';

/** Entra pelo formulário real de `/entrar`. Admin cai em `/admin`; aluno em `/inicio`. */
export async function signIn(
  page: Page,
  user: Pick<TestUser, 'email' | 'password'>,
  next?: string,
) {
  await page.goto(next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar');
  // `^Senha`: o botão "Mostrar senha" também tem "senha" no nome acessível.
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel(/^Senha/).fill(user.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

/**
 * Sem rolagem horizontal na tela atual (`scrollWidth - innerWidth === 0`).
 * Espera o layout assentar (fontes/imagens) antes de falhar.
 */
export async function expectNoHorizontalOverflow(page: Page, where = page.url()) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
      message: `overflow horizontal em ${where}`,
      timeout: 5_000,
    })
    .toBe(0);
}

/** Abre `path`, confere que carregou e que não há overflow horizontal. */
export async function visit(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `GET ${path}`).toBeLessThan(400);
  await expectNoHorizontalOverflow(page, path);
}

/**
 * Segundo contexto (outro usuário) com o mesmo perfil de dispositivo do project atual.
 * `browser.newContext()` puro perderia viewport/UA/toque do Pixel 7 e do iPhone 14.
 */
export async function newContextLikeProject(
  browser: Browser,
  testInfo: TestInfo,
): Promise<BrowserContext> {
  const use = testInfo.project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport ?? undefined,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    locale: use.locale,
  });
}

/** Link/botão visível com esse nome (o CTA do curso existe no card e na barra fixa do celular). */
export function visibleLink(page: Page, name: string | RegExp) {
  return page.getByRole('link', { name }).locator('visible=true').first();
}
