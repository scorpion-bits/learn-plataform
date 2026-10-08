import Image from 'next/image';

import { IsoCube } from '../IsoCube/IsoCube';
import type { IsoCubeTone } from '../IsoCube/IsoCube';
import styles from './IsoCover.module.css';

export interface IsoCoverProps {
  /** URL da capa. Sem ela, entra o padrão de cubo + título. */
  src?: string | null;
  /** Obrigatório com `src` (descreva a capa; "" se for puramente decorativa). */
  alt?: string;
  /** Título do curso, usado no fallback sem capa. */
  title?: string;
  tone?: IsoCubeTone;
  /** `sizes` do next/image (a capa ocupa a largura do contêiner). */
  sizes?: string;
  priority?: boolean;
  /** Para URLs remotas ainda não liberadas em `images.remotePatterns`. */
  unoptimized?: boolean;
  className?: string;
}

/**
 * Capa de curso como bloco isométrico: a imagem (16:9) é a face frontal; o
 * topo (gradiente da logo) e a lateral direita (face escura) dão espessura,
 * todos com o contorno navy da marca. Projeção oblíqua em CSS puro; a
 * profundidade escala com a largura do contêiner (container query units).
 */
export function IsoCover({
  src,
  alt = '',
  title,
  tone = 'cyan',
  sizes = '(max-width: 720px) 100vw, 560px',
  priority,
  unoptimized,
  className,
}: IsoCoverProps) {
  const hasImage = Boolean(src);

  return (
    <figure
      className={[styles.root, styles[tone], className].filter(Boolean).join(' ')}
      data-fallback={hasImage ? undefined : 'true'}
    >
      <div className={styles.stage}>
        <span className={`${styles.face} ${styles.topFace}`} aria-hidden="true" />
        <span className={`${styles.face} ${styles.sideFace}`} aria-hidden="true" />
        <div className={styles.front}>
          {hasImage ? (
            <Image
              src={src as string}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              unoptimized={unoptimized}
              className={styles.image}
            />
          ) : (
            <div className={styles.fallback}>
              <IsoCube size={56} state="filled" tone={tone} className={styles.fallbackCube} />
              {title && <p className={styles.fallbackTitle}>{title}</p>}
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
