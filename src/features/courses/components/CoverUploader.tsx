'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { IsoCover } from '@/components/brand';
import { Button } from '@/components/ui';
import { getClientEnv } from '@/lib/env/client';
import { createClient } from '@/lib/supabase/browser';

import { COVERS_BUCKET_NAME } from '../rules';
import { COVER_EXTENSIONS, COVER_MAX_BYTES, COVER_MIME_TYPES } from '../schemas';
import styles from './CoverUploader.module.css';

interface Props {
  courseId: string;
  title: string;
  /** URL pública da capa já salva (ou null). */
  initialUrl: string | null;
  /** Caminho em `course-covers` ('' = sem capa). */
  value: string;
  onChange: (path: string, previewUrl: string | null) => void;
}

type Upload =
  { state: 'idle' } | { state: 'uploading'; percent: number } | { state: 'error'; message: string };

/** Upload com XHR (único jeito de ter progresso real) direto para o Storage, com a sessão do admin. */
export function CoverUploader({ courseId, title, initialUrl, value, onChange }: Props) {
  const inputId = useId();
  const statusId = useId();
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [upload, setUpload] = useState<Upload>({ state: 'idle' });

  useEffect(() => () => xhrRef.current?.abort(), []);
  useEffect(
    () => () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function send(file: File) {
    const type = file.type as (typeof COVER_MIME_TYPES)[number];
    if (!COVER_MIME_TYPES.includes(type)) {
      setUpload({ state: 'error', message: 'Use uma imagem JPG, PNG, WebP ou AVIF.' });
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setUpload({ state: 'error', message: 'A imagem pode ter no máximo 5 MB.' });
      return;
    }

    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setUpload({ state: 'error', message: 'Sessão expirada. Entre novamente.' });
      return;
    }

    const env = getClientEnv();
    const path = `courses/${courseId}/${crypto.randomUUID()}.${COVER_EXTENSIONS[type]}`;
    const body = new FormData();
    body.append('cacheControl', '31536000');
    body.append('', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open(
      'POST',
      `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${COVERS_BUCKET_NAME}/${path}`,
    );
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUpload({ state: 'uploading', percent: Math.round((e.loaded / e.total) * 100) });
      }
    };
    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        const url = URL.createObjectURL(file);
        setPreview(url);
        setUpload({ state: 'idle' });
        onChange(path, url);
      } else {
        setUpload({ state: 'error', message: 'Não foi possível enviar a imagem. Tente de novo.' });
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setUpload({ state: 'error', message: 'Falha de conexão no envio. Tente de novo.' });
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      setUpload({ state: 'idle' });
    };
    setUpload({ state: 'uploading', percent: 0 });
    xhr.send(body);
  }

  const uploading = upload.state === 'uploading';

  return (
    <div className={styles.root}>
      <IsoCover
        src={preview}
        alt={preview ? 'Prévia da capa' : ''}
        title={title || 'Novo curso'}
        unoptimized={preview?.startsWith('blob:')}
      />
      <div className={styles.controls}>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept={COVER_MIME_TYPES.join(',')}
          disabled={uploading}
          aria-describedby={statusId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void send(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          pending={uploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {value ? 'Trocar capa' : 'Enviar capa'}
        </Button>
        {uploading && (
          <Button type="button" variant="ghost" onClick={() => xhrRef.current?.abort()}>
            Cancelar
          </Button>
        )}
        {value && !uploading && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPreview(null);
              onChange('', null);
            }}
          >
            Remover
          </Button>
        )}
      </div>
      <div id={statusId} className={styles.status} aria-live="polite">
        {uploading ? (
          <>
            <progress
              className={styles.progress}
              max={100}
              value={upload.percent}
              aria-label="Progresso do envio"
            />
            <span>{upload.percent}%</span>
          </>
        ) : upload.state === 'error' ? (
          <span className={styles.error} role="alert">
            {upload.message}
          </span>
        ) : (
          <span className={styles.hint}>
            JPG, PNG, WebP ou AVIF, até 5 MB, proporção 16:9. A capa só vale depois de salvar.
          </span>
        )}
      </div>
    </div>
  );
}
