import { expect, test } from '@playwright/test';

import { waitForConfirmationLink } from './support/mailpit';
import { PASSWORD, getFullName, service, uniqueEmail } from './support/service';
import { expectNoHorizontalOverflow, signIn, visit } from './support/ui';

test.describe('cadastro e login', () => {
  test('cadastro → confirmação de email (Mailpit) → /inicio', async ({ page }) => {
    const email = uniqueEmail('signup');
    const fullName = 'Ana Cadastro E2E';

    await visit(page, '/cadastro');
    await page.getByLabel('Nome').fill(fullName);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Senha/).fill(PASSWORD);
    await page.getByLabel(/^Confirmar senha/).fill(PASSWORD);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    // Com confirmação de email ligada (CI) o app pede para abrir o email; com ela desligada
    // (padrão do supabase/config.toml em dev) a sessão já nasce aberta e vai direto a /inicio.
    const notice = page.getByText('Confira seu email.');
    await expect(notice.or(page.getByRole('heading', { level: 1, name: /^Olá/ }))).toBeVisible({
      timeout: 15_000,
    });
    if (await notice.isVisible()) {
      await expectNoHorizontalOverflow(page, '/cadastro (confirme seu email)');
      const link = await waitForConfirmationLink(email);
      await page.goto(link);
    }

    await expect(page).toHaveURL(/\/inicio/);
    await expect(page.getByRole('heading', { level: 1, name: /^Olá/ })).toBeVisible();
    await expectNoHorizontalOverflow(page, '/inicio');

    // Trigger do banco: perfil com o nome e papel `student` (nunca admin pelo cadastro).
    const { data: users } = await service().auth.admin.listUsers({ perPage: 1000 });
    const created = users.users.find((u) => u.email === email);
    expect(created, 'usuário criado no Auth').toBeTruthy();
    expect(await getFullName(created!.id)).toBe(fullName);
    const { data: roles } = await service()
      .from('user_roles')
      .select('role')
      .eq('user_id', created!.id);
    expect((roles ?? []).map((r) => r.role)).toEqual(['student']);

    // E o mesmo usuário consegue entrar de novo (sair e voltar).
    await page.context().clearCookies();
    await signIn(page, { email, password: PASSWORD });
    await expect(page).toHaveURL(/\/inicio/);
  });

  test('credenciais erradas mostram erro genérico e rotas protegidas pedem login', async ({
    page,
  }) => {
    await visit(page, '/entrar');
    await page.getByLabel('Email').fill(uniqueEmail('nobody'));
    await page.getByLabel(/^Senha/).fill('senha-errada-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Email ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);

    await page.goto('/minha-biblioteca');
    await expect(page).toHaveURL(/\/entrar\?next=%2Fminha-biblioteca/);
  });
});
