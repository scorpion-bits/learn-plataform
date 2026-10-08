import { getClientEnv } from '@/lib/env/client';
import { createClient } from '@/lib/supabase/browser';

import { CONTENT_BUCKET_NAME } from './schemas';

export type UploadResult = { ok: true } | { ok: false; aborted: boolean; message: string };

/**
 * Envia um arquivo ao bucket privado `course-content` com a sessão do admin (a policy de
 * INSERT exige `is_admin()`). XHR é o único jeito de ter progresso real; `signal` cancela.
 * Somente navegador.
 */
export async function uploadToContentBucket(options: {
  path: string;
  file: File;
  mimeType: string;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}): Promise<UploadResult> {
  const { path, file, mimeType, signal, onProgress } = options;
  if (signal.aborted) return { ok: false, aborted: true, message: 'Envio cancelado.' };

  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, aborted: false, message: 'Sessão expirada. Entre novamente.' };

  const env = getClientEnv();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const body = new FormData();
  body.append('cacheControl', '3600');
  // O Content-Type do envio é o do Blob: o bucket só aceita a lista de MIME permitidos.
  body.append('', file.slice(0, file.size, mimeType));

  return new Promise<UploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    const done = (result: UploadResult) => {
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };

    xhr.open(
      'POST',
      `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${CONTENT_BUCKET_NAME}/${encodedPath}`,
    );
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      done(
        xhr.status >= 200 && xhr.status < 300
          ? { ok: true }
          : {
              ok: false,
              aborted: false,
              message:
                xhr.status === 413
                  ? 'O arquivo é maior que o limite do projeto no Storage.'
                  : 'Não foi possível enviar o arquivo. Tente de novo.',
            },
      );
    xhr.onerror = () =>
      done({ ok: false, aborted: false, message: 'Falha de conexão no envio. Tente de novo.' });
    xhr.onabort = () => done({ ok: false, aborted: true, message: 'Envio cancelado.' });
    xhr.send(body);
  });
}
