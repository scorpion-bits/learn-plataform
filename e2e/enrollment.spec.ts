import { expect, test } from '@playwright/test';

import { activeEnrollmentCount, createPublishedCourse, createUser } from './support/service';
import { expectNoHorizontalOverflow, newContextLikeProject, signIn, visit } from './support/ui';

test('admin atribui o curso ao aluno (acesso) e revoga (acesso negado)', async ({
  browser,
  page: adminPage,
}, testInfo) => {
  const admin = await createUser({ prefix: 'granter', admin: true });
  const student = await createUser({ prefix: 'grantee' });
  const course = await createPublishedCourse({ lessonCount: 1 });
  const lesson = course.lessons[0]!;
  const lessonPath = `/aprender/${course.slug}/${lesson.id}`;

  const studentContext = await newContextLikeProject(browser, testInfo);
  const studentPage = await studentContext.newPage();

  try {
    await signIn(adminPage, admin);
    await signIn(studentPage, student);

    await test.step('antes: aluno sem acesso não vê o material', async () => {
      await visit(studentPage, '/minha-biblioteca');
      await expect(studentPage.getByRole('heading', { name: course.title })).toHaveCount(0);
      await studentPage.goto(lessonPath);
      await expect(studentPage.getByText(lesson.body)).toHaveCount(0);
    });

    await test.step('admin atribui o curso', async () => {
      await visit(adminPage, `/admin/alunos/${student.id}`);
      await adminPage.getByLabel(/^Atribuir curso/).selectOption({ label: course.title });
      await adminPage.getByRole('button', { name: 'Atribuir', exact: true }).click();
      await expect
        .poll(() => activeEnrollmentCount(student.id, course.id), { message: 'matrícula ativa' })
        .toBe(1);
      await expect(adminPage.getByRole('button', { name: 'Remover atribuição' })).toBeVisible();
      await expectNoHorizontalOverflow(adminPage, 'aluno (admin)');
    });

    await test.step('aluno acessa o curso e a aula', async () => {
      await visit(studentPage, '/minha-biblioteca?aba=todos');
      await expect(studentPage.getByRole('heading', { name: course.title })).toBeVisible();
      await visit(studentPage, lessonPath);
      await expect(studentPage.getByText(lesson.body)).toBeVisible();
    });

    await test.step('admin revoga', async () => {
      await adminPage.getByRole('button', { name: 'Remover atribuição' }).click();
      const dialog = adminPage.getByRole('dialog');
      await dialog.getByLabel(/^Motivo/).fill('Teste E2E de revogação');
      await dialog.getByRole('button', { name: 'Remover atribuição' }).click();
      await expect
        .poll(() => activeEnrollmentCount(student.id, course.id), { message: 'matrícula revogada' })
        .toBe(0);
    });

    await test.step('aluno perde o acesso', async () => {
      await studentPage.goto('/minha-biblioteca?aba=todos');
      await expect(studentPage.getByRole('heading', { name: course.title })).toHaveCount(0);
      await studentPage.goto(lessonPath);
      await expect(studentPage.getByText(lesson.body)).toHaveCount(0);
      expect(await studentPage.content()).not.toContain(lesson.body);
    });
  } finally {
    await studentContext.close();
  }
});
