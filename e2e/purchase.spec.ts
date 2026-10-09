import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { loadE2eEnv } from './support/env';
import {
  billingIdOf,
  postWebhook,
  sendCompletedWebhook,
  signBody,
  simulatePayment,
} from './support/payments';
import {
  activeEnrollmentCount,
  completedLessonCount,
  createPublishedCourse,
  createUser,
  getOrder,
} from './support/service';
import type { TestCourse, TestUser } from './support/service';
import { expectNoHorizontalOverflow, signIn, visibleLink, visit } from './support/ui';

const CPF = '111.444.777-35'; // CPF válido (dígitos verificadores corretos)
const PHONE = '(11) 94002-8922';

/** Curso → "Comprar" → CPF/celular → "Gerar PIX" → página do pedido com o PIX do mock. */
async function startPurchase(page: Page, course: TestCourse): Promise<string> {
  await visit(page, `/cursos/${course.slug}`);
  await visibleLink(page, /^Comprar$/).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${course.slug}$`));
  await expectNoHorizontalOverflow(page, 'checkout');

  await page.getByLabel(/^CPF/).fill(CPF);
  await page.getByLabel(/^Celular/).fill(PHONE);
  await page.getByRole('button', { name: 'Gerar PIX' }).click();

  await expect(page).toHaveURL(/\/checkout\/pedido\/[0-9a-f-]{36}$/);
  const orderId = page.url().split('/').pop()!;
  await expect(page.getByLabel('Pix Copia e Cola')).toHaveValue(/BR\.GOV\.BCB\.PIX/);
  await expect(page.getByText('Aguardando pagamento')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'pedido (PIX)');
  return orderId;
}

/** Biblioteca → abre a 1ª aula → vê o material → conclui → o progresso aparece. */
async function studyAndComplete(page: Page, student: TestUser, course: TestCourse) {
  await visit(page, '/minha-biblioteca?aba=todos');
  await expect(page.getByRole('heading', { name: course.title })).toBeVisible();
  await expect(page.getByText(`0 de ${course.lessons.length} aulas concluídas`)).toBeVisible();

  await page.getByRole('link', { name: `Começar: ${course.title}` }).click();
  const first = course.lessons[0]!;
  await expect(page).toHaveURL(/\/aprender\/[^/]+\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: first.title })).toBeVisible();
  await expect(page.getByText(first.body)).toBeVisible();
  await expectNoHorizontalOverflow(page, 'player');

  await page.getByRole('button', { name: 'Concluir aula' }).locator('visible=true').first().click();
  await expect(
    page
      .getByRole('button', { name: 'Aula concluída. Desfazer conclusão' })
      .locator('visible=true')
      .first(),
  ).toBeVisible();
  await expect
    .poll(() => completedLessonCount(student.id, course.id), { message: 'lesson_progress' })
    .toBe(1);

  await visit(page, '/minha-biblioteca?aba=todos');
  await expect(page.getByText(`1 de ${course.lessons.length} aulas concluídas`)).toBeVisible();
}

test.describe('compra PIX (mock da AbacatePay)', () => {
  test('webhook transparent.completed → pago → biblioteca → aula → progresso', async ({ page }) => {
    const student = await createUser({ prefix: 'buyer' });
    const course = await createPublishedCourse({ priceCents: 4990, lessonCount: 2 });

    await signIn(page, student);
    const orderId = await startPurchase(page, course);
    const billingId = await billingIdOf(orderId);

    // Sai da página do pedido (para o polling do aluno não vencer o webhook) e "paga" no mock.
    await visit(page, '/minha-biblioteca');
    await simulatePayment(billingId);

    await test.step('webhook real do app libera o acesso', async () => {
      const res = await sendCompletedWebhook(orderId, billingId);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, result: 'fulfilled' });
      expect((await getOrder(orderId)).status).toBe('paid');
      expect(await activeEnrollmentCount(student.id, course.id)).toBe(1);

      // Reentrega do mesmo evento é idempotente (a AbacatePay re-tenta).
      const again = await sendCompletedWebhook(orderId, billingId);
      expect(again.status).toBe(200);
      expect(await activeEnrollmentCount(student.id, course.id)).toBe(1);
    });

    await visit(page, `/checkout/pedido/${orderId}`);
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'pedido pago');

    await studyAndComplete(page, student, course);
  });

  test('plano B: sem webhook, a reconsulta do polling vira PAID', async ({ page }) => {
    const student = await createUser({ prefix: 'polling' });
    const course = await createPublishedCourse({ priceCents: 9900, lessonCount: 1 });

    await signIn(page, student);
    const orderId = await startPurchase(page, course);
    const billingId = await billingIdOf(orderId);

    // Nenhum webhook: só o mock passa a responder PAID e a tela precisa perceber sozinha
    // (polling a cada 3–5 s + reconsulta ao provedor no máx. 1×/10 s).
    await simulatePayment(billingId);
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible({ timeout: 60_000 });
    expect((await getOrder(orderId)).status).toBe('paid');
    expect(await activeEnrollmentCount(student.id, course.id)).toBe(1);

    await page.getByRole('link', { name: 'Começar o curso' }).click();
    await expect(page).toHaveURL(/\/aprender\//);
    await expect(page.getByText(course.lessons[0]!.body)).toBeVisible();
  });

  test('webhook sem o segredo, com segredo errado ou sem assinatura válida não libera nada', async ({
    page,
  }) => {
    const student = await createUser({ prefix: 'forged' });
    const course = await createPublishedCourse({ lessonCount: 1 });

    await signIn(page, student);
    const orderId = await startPurchase(page, course);
    const billingId = await billingIdOf(orderId);
    const raw = JSON.stringify({
      id: `log_forged_${orderId}`,
      event: 'transparent.completed',
      devMode: true,
      data: {
        transparent: {
          id: billingId,
          externalId: orderId,
          amount: course.priceCents,
          paidAmount: course.priceCents,
          status: 'PAID',
        },
      },
    });

    expect((await postWebhook(raw, { secret: null })).status).toBe(401);
    expect((await postWebhook(raw, { secret: 'segredo-errado' })).status).toBe(401);
    const secret = loadE2eEnv().webhookSecret;
    expect((await postWebhook(raw, { secret, signature: signBody('outro corpo') })).status).toBe(
      401,
    );

    // Evento verdadeiro na forma, mas a cobrança NÃO foi paga no provedor (mock = PENDING):
    // a reconsulta obrigatória impede liberar o acesso (ADR-008/ADR-018).
    const forged = await postWebhook(raw, { secret });
    expect(forged.status).toBe(503);
    expect((await getOrder(orderId)).status).toBe('pending');
    expect(await activeEnrollmentCount(student.id, course.id)).toBe(0);
  });
});
