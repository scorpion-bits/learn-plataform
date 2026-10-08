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

const { registerLessonVisit, requestMaterialDownload } = await import('./actions');

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
