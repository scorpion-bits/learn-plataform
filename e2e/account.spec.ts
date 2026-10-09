import { expect, test } from '@playwright/test';

import { createPaidOrder, createPublishedCourse, createUser, getFullName } from './support/service';
import { expectNoHorizontalOverflow, signIn, visit } from './support/ui';

test.describe('conta do aluno', () => {
  test('salva o nome e lista o pedido em /conta/pedidos', async ({ page }) => {
    const student = await createUser({ prefix: 'account', fullName: 'Nome Antigo' });
    const course = await createPublishedCourse({ priceCents: 7500, lessonCount: 1 });
    await createPaidOrder(student, course);

    await signIn(page, student);

    await visit(page, '/conta');
    await expect(page.getByRole('heading', { level: 1, name: 'Minha conta' })).toBeVisible();
    await page.getByLabel(/^Nome/).fill('Nome Novo E2E');
    await page.getByRole('button', { name: 'Salvar dados' }).click();
    await expect(page.getByText('Dados salvos.')).toBeVisible();
    await expect
      .poll(() => getFullName(student.id), { message: 'profiles.full_name' })
      .toBe('Nome Novo E2E');
    await page.reload();
    await expect(page.getByLabel(/^Nome/)).toHaveValue('Nome Novo E2E');
    await expectNoHorizontalOverflow(page, '/conta');

    await visit(page, '/conta/pedidos');
    await expect(page.getByRole('heading', { level: 1, name: 'Meus pedidos' })).toBeVisible();
    await expect(page.getByText(course.title)).toBeVisible();
    await expect(page.getByText('Pago', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, '/conta/pedidos');
  });

  test('rota inexistente logado mostra o 404 de marca', async ({ page }) => {
    const student = await createUser({ prefix: 'notfound' });
    await signIn(page, student);
    const response = await page.goto('/conta/nao-existe-e2e');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expectNoHorizontalOverflow(page, '404 logado');
  });
});
