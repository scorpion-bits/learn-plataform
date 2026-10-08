import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireUser = vi.fn();
vi.mock('@/lib/auth/dal', () => ({ requireUser: () => requireUser(), requireAdmin: vi.fn() }));

const getMaterialDownloadUrl = vi.fn();
vi.mock('@/features/materials/storage', () => ({
  getMaterialDownloadUrl: (id: string) => getMaterialDownloadUrl(id),
}));

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from })) }));

const { registerLessonVisit, requestMaterialDownload, setLessonCompleted } =
  await import('./actions');

const user = { id: 'user-1', email: 'a@b.com' };
const MATERIAL_ID = '50000000-0000-4000-8000-000000000003';
const LESSON_ID = '40000000-0000-4000-8000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue(user);
});

describe('requestMaterialDownload', () => {
  it('devolve a signed URL quando o usuário tem acesso', async () => {
    getMaterialDownloadUrl.mockResolvedValueOnce({
      ok: true,
      data: { url: 'https://signed.example/file', fileName: 'guia.zip', expiresInSeconds: 600 },
    });
    await expect(requestMaterialDownload({ materialId: MATERIAL_ID })).resolves.toEqual({
      ok: true,
      data: { url: 'https://signed.example/file', fileName: 'guia.zip' },
    });
    expect(getMaterialDownloadUrl).toHaveBeenCalledWith(MATERIAL_ID);
  });

  it('rejeita material sem acesso (RLS esconde: not_found) sem vazar URL', async () => {
    getMaterialDownloadUrl.mockResolvedValueOnce({ ok: false, error: 'not_found' });
    const result = await requestMaterialDownload({ materialId: MATERIAL_ID });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('sem acesso') });
    expect(JSON.stringify(result)).not.toContain('http');
  });

  it.each(['not_a_file', 'unavailable', 'invalid_id'] as const)(
    'erro %s vira mensagem amigável',
    async (error) => {
      getMaterialDownloadUrl.mockResolvedValueOnce({ ok: false, error });
      const result = await requestMaterialDownload({ materialId: MATERIAL_ID });
      expect(result.ok).toBe(false);
    },
  );

  it('id malformado: não consulta nem assina nada', async () => {
    const result = await requestMaterialDownload({ materialId: '../../x' });
    expect(result).toMatchObject({ ok: false, fieldErrors: { materialId: expect.any(Array) } });
    expect(getMaterialDownloadUrl).not.toHaveBeenCalled();
  });

  it('anônimo: o guard barra antes de qualquer leitura', async () => {
    requireUser.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/entrar'));
    await expect(requestMaterialDownload({ materialId: MATERIAL_ID })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(getMaterialDownloadUrl).not.toHaveBeenCalled();
  });
});

describe('registerLessonVisit', () => {
  it('faz upsert só com user_id e lesson_id (sem completed_at nem course_id)', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    await expect(registerLessonVisit({ lessonId: LESSON_ID })).resolves.toEqual({
      ok: true,
      data: { registered: true },
    });
    expect(from).toHaveBeenCalledWith('lesson_progress');
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', lesson_id: LESSON_ID },
      { onConflict: 'user_id,lesson_id' },
    );
  });

  it('usa o usuário da sessão, nunca um user_id vindo do input', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    await registerLessonVisit({ lessonId: LESSON_ID, user_id: 'outro' });
    expect(upsert.mock.calls[0]?.[0]).toEqual({ user_id: 'user-1', lesson_id: LESSON_ID });
  });

  it('sem acesso (RLS 42501): não registra e não é erro', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '42501', message: 'rls' } });
    await expect(registerLessonVisit({ lessonId: LESSON_ID })).resolves.toEqual({
      ok: true,
      data: { registered: false },
    });
  });

  it('erro inesperado propaga', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '08006', message: 'down' } });
    await expect(registerLessonVisit({ lessonId: LESSON_ID })).rejects.toThrow();
  });

  it('lessonId inválido: nada é gravado', async () => {
    const result = await registerLessonVisit({ lessonId: 'x' });
    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('setLessonCompleted', () => {
  it('conclui: upsert com user_id da sessão, lesson_id e completed_at (sem course_id)', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    await expect(setLessonCompleted({ lessonId: LESSON_ID, completed: true })).resolves.toEqual({
      ok: true,
      data: { completed: true },
    });
    expect(from).toHaveBeenCalledWith('lesson_progress');
    const [payload, options] = upsert.mock.calls[0]!;
    expect(Object.keys(payload).sort()).toEqual(['completed_at', 'lesson_id', 'user_id']);
    expect(payload).toMatchObject({ user_id: 'user-1', lesson_id: LESSON_ID });
    expect(Number.isNaN(Date.parse(payload.completed_at))).toBe(false);
    expect(options).toEqual({ onConflict: 'user_id,lesson_id' });
  });

  it('desfaz: completed_at = null', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    await setLessonCompleted({ lessonId: LESSON_ID, completed: false });
    expect(upsert.mock.calls[0]?.[0]).toEqual({
      user_id: 'user-1',
      lesson_id: LESSON_ID,
      completed_at: null,
    });
  });

  it('ignora user_id/course_id vindos do input', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    await setLessonCompleted({
      lessonId: LESSON_ID,
      completed: true,
      user_id: 'outro',
      course_id: 'x',
    });
    const payload = upsert.mock.calls[0]?.[0];
    expect(payload.user_id).toBe('user-1');
    expect(payload).not.toHaveProperty('course_id');
  });

  it('RLS barrou (42501): erro explícito, nunca sucesso falso', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '42501', message: 'rls' } });
    const result = await setLessonCompleted({ lessonId: LESSON_ID, completed: true });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('acesso') });
  });

  it('falha do banco: erro amigável sem vazar a mensagem', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '08006', message: 'secret detail' } });
    const result = await setLessonCompleted({ lessonId: LESSON_ID, completed: true });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('secret detail');
  });

  it('input inválido (completed não booleano / id ruim): nada é gravado', async () => {
    const a = await setLessonCompleted({ lessonId: LESSON_ID, completed: 'true' });
    const b = await setLessonCompleted({ lessonId: 'x', completed: true });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('anônimo: o guard barra antes de qualquer escrita', async () => {
    requireUser.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/entrar'));
    await expect(setLessonCompleted({ lessonId: LESSON_ID, completed: true })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(upsert).not.toHaveBeenCalled();
  });
});
