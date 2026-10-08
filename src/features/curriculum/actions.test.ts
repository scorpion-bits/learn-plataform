import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

class NotFoundError extends Error {}
const requireAdmin = vi.fn();
vi.mock('@/lib/auth/dal', () => ({
  requireAdmin: () => requireAdmin(),
  requireUser: vi.fn(),
}));

// Builder encadeável e "thenable"; cada tabela/operação pode ter seu próprio resultado.
type Result = { data: unknown; error: unknown };
let results: Record<string, Result>;
let fallback: Result;
const calls: { table: string; op: string; arg?: unknown }[] = [];
const rpc = vi.fn<(...args: unknown[]) => Promise<Result>>(async () => ({
  data: null,
  error: null,
}));
const remove = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: null,
  error: null,
}));

function builder(table: string) {
  let op = 'select';
  const b: Record<string, unknown> = {};
  for (const name of ['insert', 'update', 'delete', 'select', 'eq', 'order', 'limit']) {
    b[name] = (arg?: unknown) => {
      if (['insert', 'update', 'delete'].includes(name)) op = name;
      calls.push({ table, op: name, arg });
      return b;
    };
  }
  const resolve = () => results[`${table}.${op}`] ?? fallback;
  b.single = () => Promise.resolve(resolve());
  b.maybeSingle = () => Promise.resolve(resolve());
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(resolve()).then(res, rej);
  return b;
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (t: string) => builder(t),
    rpc: (...args: unknown[]) => rpc(...args),
    storage: { from: (bucket: string) => ({ remove: (p: string[]) => remove(bucket, p) }) },
  })),
}));

import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  renameLesson,
  renameModule,
  reorderLessons,
  reorderModules,
  setLessonDuration,
  setLessonPreview,
} from './actions';

const COURSE = '11111111-1111-4111-8111-111111111111';
const MODULE = '22222222-2222-4222-8222-222222222222';
const LESSON = '33333333-3333-4333-8333-333333333333';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const find = (table: string, op: string) => calls.find((c) => c.table === table && c.op === op);

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results = {};
  fallback = { data: { id: LESSON, course_id: COURSE }, error: null };
  requireAdmin.mockResolvedValue({ id: 'admin-1', email: 'a@b.c' });
  rpc.mockResolvedValue({ data: null, error: null });
});

describe('autorização', () => {
  it('não-admin é rejeitado antes de ler o input ou tocar no banco', async () => {
    requireAdmin.mockRejectedValue(new NotFoundError('notFound'));
    const attempts = [
      createModule({ courseId: COURSE, title: 'x' }),
      renameModule({ id: MODULE, title: 'x' }),
      deleteModule({ id: MODULE }),
      reorderModules({ courseId: COURSE, ids: [A] }),
      createLesson({ moduleId: MODULE, title: 'x' }),
      renameLesson({ id: LESSON, title: 'x' }),
      setLessonPreview({ id: LESSON, isPreview: true }),
      setLessonDuration({ id: LESSON, minutes: 5 }),
      deleteLesson({ id: LESSON }),
      reorderLessons({ moduleId: MODULE, ids: [A] }),
    ];
    for (const attempt of attempts) await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('validação', () => {
  it('ids que não são uuid e títulos em branco não chegam ao banco', async () => {
    expect(await createModule({ courseId: 'abc', title: 'x' })).toMatchObject({ ok: false });
    expect(await createModule({ courseId: COURSE, title: '   ' })).toMatchObject({
      ok: false,
      fieldErrors: { title: expect.any(Array) },
    });
    expect(await deleteLesson({ id: "1'; drop table lessons;--" })).toMatchObject({ ok: false });
    expect(await reorderModules({ courseId: COURSE, ids: [A, A] })).toMatchObject({ ok: false });
    expect(await reorderLessons({ moduleId: MODULE, ids: [] })).toMatchObject({ ok: false });
    expect(await setLessonDuration({ id: LESSON, minutes: -1 })).toMatchObject({ ok: false });
    expect(await setLessonDuration({ id: LESSON, minutes: 1.5 })).toMatchObject({ ok: false });
    expect(calls).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('createModule', () => {
  it('anexa no fim: posição = maior existente + 1', async () => {
    results['course_modules.select'] = { data: [{ position: 0 }, { position: 4 }], error: null };
    results['course_modules.insert'] = { data: { id: MODULE }, error: null };
    const res = await createModule({ courseId: COURSE, title: '  Introdução  ' });
    expect(res).toEqual({ ok: true, data: { id: MODULE } });
    expect(find('course_modules', 'insert')?.arg).toEqual({
      course_id: COURSE,
      title: 'Introdução',
      position: 5,
    });
    expect(revalidatePath).toHaveBeenCalled();
  });
  it('primeiro módulo fica na posição 0', async () => {
    results['course_modules.select'] = { data: [], error: null };
    results['course_modules.insert'] = { data: { id: MODULE }, error: null };
    await createModule({ courseId: COURSE, title: 'A' });
    expect(find('course_modules', 'insert')?.arg).toMatchObject({ position: 0 });
  });
  it('conflito de posição (edição concorrente) vira erro amigável', async () => {
    results['course_modules.select'] = { data: [], error: null };
    results['course_modules.insert'] = { data: null, error: { code: '23505' } };
    expect(await createModule({ courseId: COURSE, title: 'A' })).toMatchObject({ ok: false });
  });
});

describe('createLesson', () => {
  it('insere no módulo na próxima posição, com o course_id do módulo', async () => {
    results['course_modules.select'] = { data: { course_id: COURSE }, error: null };
    results['lessons.select'] = { data: [{ position: 2 }], error: null };
    results['lessons.insert'] = { data: { id: LESSON }, error: null };
    const res = await createLesson({ moduleId: MODULE, title: 'Aula 1' });
    expect(res).toEqual({ ok: true, data: { id: LESSON } });
    expect(find('lessons', 'insert')?.arg).toEqual({
      module_id: MODULE,
      course_id: COURSE,
      title: 'Aula 1',
      position: 3,
    });
  });
  it('módulo inexistente vira erro, sem inserir', async () => {
    results['course_modules.select'] = { data: null, error: null };
    expect(await createLesson({ moduleId: MODULE, title: 'x' })).toMatchObject({ ok: false });
    expect(find('lessons', 'insert')).toBeUndefined();
  });
});

describe('renomear / prévia / duração', () => {
  it('renomeia módulo e aula com título aparado', async () => {
    await renameModule({ id: MODULE, title: ' Novo ' });
    expect(find('course_modules', 'update')?.arg).toEqual({ title: 'Novo' });
    await renameLesson({ id: LESSON, title: ' Aula ' });
    expect(find('lessons', 'update')?.arg).toEqual({ title: 'Aula' });
  });
  it('alvo inexistente devolve erro', async () => {
    results['lessons.update'] = { data: null, error: null };
    expect(await renameLesson({ id: LESSON, title: 'x' })).toMatchObject({ ok: false });
  });
  it('marca/desmarca prévia', async () => {
    await setLessonPreview({ id: LESSON, isPreview: true });
    expect(find('lessons', 'update')?.arg).toEqual({ is_preview: true });
  });
  it('duração chega em minutos e é gravada em segundos', async () => {
    await setLessonDuration({ id: LESSON, minutes: 12 });
    expect(find('lessons', 'update')?.arg).toEqual({ duration_seconds: 720 });
  });
  it('duração vazia grava null', async () => {
    await setLessonDuration({ id: LESSON, minutes: null });
    expect(find('lessons', 'update')?.arg).toEqual({ duration_seconds: null });
  });
});

describe('reordenação', () => {
  it('módulos: chama a RPC com a ordem recebida', async () => {
    const res = await reorderModules({ courseId: COURSE, ids: [C, A, B] });
    expect(res).toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('reorder_modules', {
      p_course_id: COURSE,
      p_module_ids: [C, A, B],
    });
  });
  it('aulas: chama a RPC com a ordem recebida', async () => {
    await reorderLessons({ moduleId: MODULE, ids: [B, A] });
    expect(rpc).toHaveBeenCalledWith('reorder_lessons', {
      p_module_id: MODULE,
      p_lesson_ids: [B, A],
    });
  });
  it('lista desatualizada (22023) vira erro amigável', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'x' } });
    expect(await reorderModules({ courseId: COURSE, ids: [A] })).toMatchObject({
      ok: false,
      error: expect.stringContaining('ementa'),
    });
  });
  it('erro inesperado do banco propaga', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } });
    await expect(reorderLessons({ moduleId: MODULE, ids: [A] })).rejects.toThrow();
  });
});

describe('exclusão', () => {
  it('módulo: apaga e remove do storage os arquivos dos materiais', async () => {
    results['course_modules.select'] = {
      data: {
        id: MODULE,
        lessons: [
          { lesson_materials: [{ storage_path: 'c/l/1-a.zip' }, { storage_path: null }] },
          { lesson_materials: [{ storage_path: 'c/l/2-b.zip' }] },
        ],
      },
      error: null,
    };
    results['course_modules.delete'] = { data: null, error: null };
    const res = await deleteModule({ id: MODULE });
    expect(res).toEqual({ ok: true, data: { id: MODULE } });
    expect(find('course_modules', 'delete')).toBeDefined();
    expect(remove).toHaveBeenCalledWith('course-content', ['c/l/1-a.zip', 'c/l/2-b.zip']);
  });
  it('aula: apaga e limpa arquivos; sem arquivos não chama o storage', async () => {
    results['lessons.select'] = {
      data: { id: LESSON, lesson_materials: [{ storage_path: 'c/l/1-a.zip' }] },
      error: null,
    };
    expect(await deleteLesson({ id: LESSON })).toMatchObject({ ok: true });
    expect(find('lessons', 'delete')).toBeDefined();
    expect(remove).toHaveBeenCalledWith('course-content', ['c/l/1-a.zip']);

    remove.mockClear();
    results['lessons.select'] = { data: { id: LESSON, lesson_materials: [] }, error: null };
    await deleteLesson({ id: LESSON });
    expect(remove).not.toHaveBeenCalled();
  });
  it('alvo inexistente: erro, sem delete', async () => {
    results['lessons.select'] = { data: null, error: null };
    expect(await deleteLesson({ id: LESSON })).toMatchObject({ ok: false });
    expect(find('lessons', 'delete')).toBeUndefined();
  });
  it('falha ao remover do storage não invalida a exclusão', async () => {
    results['lessons.select'] = {
      data: { id: LESSON, lesson_materials: [{ storage_path: 'x' }] },
      error: null,
    };
    remove.mockRejectedValueOnce(new Error('storage down'));
    expect(await deleteLesson({ id: LESSON })).toMatchObject({ ok: true });
  });
  it('falha ao apagar propaga (error boundary)', async () => {
    results['lessons.select'] = { data: { id: LESSON, lesson_materials: [] }, error: null };
    results['lessons.delete'] = { data: null, error: { code: 'XX000' } };
    await expect(deleteLesson({ id: LESSON })).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
  });
});
