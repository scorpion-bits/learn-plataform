'use client';

import { useState } from 'react';

import { Button } from '@/components/ui';

import { requestMaterialDownload } from '../../actions';
import { formatFileSize } from '../../model';
import { DownloadIcon, FileIcon } from '../icons';

import styles from './Materials.module.css';

export interface FileMaterialProps {
  materialId: string;
  fileName: string;
  fileSize: number | null;
}

/**
 * Arquivo para download. O botão pede a signed URL curta a uma Server Action (que confere
 * login e deixa a RLS decidir o acesso) e navega para ela; a URL nunca fica na página.
 */
export function FileMaterial({ materialId, fileName, fileSize }: FileMaterialProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = formatFileSize(fileSize);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const result = await requestMaterialDownload({ materialId });
      if (result.ok) {
        // a URL assinada responde com Content-Disposition: attachment, então a aula continua aberta
        window.location.assign(result.data.url);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Não foi possível baixar agora. Verifique sua conexão e tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <span className={styles.cardIcon} aria-hidden="true">
        <FileIcon />
      </span>
      <div className={styles.cardText}>
        <p className={styles.cardTitle}>{fileName}</p>
        {size ? <p className={styles.cardMeta}>{size}</p> : null}
      </div>
      <Button
        variant="secondary"
        icon={<DownloadIcon />}
        pending={pending}
        onClick={download}
        aria-label={`Baixar ${fileName}${size ? ` (${size})` : ''}`}
      >
        Baixar
      </Button>
      {error ? (
        <p className={styles.cardStatus} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
