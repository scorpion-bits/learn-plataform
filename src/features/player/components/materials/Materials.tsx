import { EmptyState } from '@/components/ui';

import type { PlayerMaterial } from '../../model';

import { FileMaterial } from './FileMaterial';
import { LinkMaterial } from './LinkMaterial';
import { TextMaterial } from './TextMaterial';
import { VideoMaterial } from './VideoMaterial';
import styles from './Materials.module.css';

const DEFAULT_TITLE = {
  video: 'Vídeo',
  text: 'Texto',
  file: 'Arquivo',
  link: 'Link',
} as const;

/** Materiais da aula na ordem do banco. Cada um é uma região nomeada (h2). */
export function Materials({ materials }: { materials: PlayerMaterial[] }) {
  if (materials.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        title="Esta aula ainda não tem materiais"
        description="Volte em breve: o conteúdo é publicado pela equipe."
      />
    );
  }

  return (
    <div className={styles.list}>
      {materials.map((material) => {
        const headingId = `material-${material.id}`;
        const title = material.title ?? DEFAULT_TITLE[material.type];
        return (
          <section key={material.id} className={styles.material} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className={material.title ? styles.heading : `${styles.heading} ${styles.srOnly}`}
            >
              {title}
            </h2>
            {material.type === 'video' ? (
              <VideoMaterial
                provider={material.provider}
                videoId={material.videoId}
                title={title}
              />
            ) : material.type === 'text' ? (
              <TextMaterial body={material.body} />
            ) : material.type === 'file' ? (
              <FileMaterial
                materialId={material.id}
                fileName={material.fileName}
                fileSize={material.fileSize}
              />
            ) : (
              <LinkMaterial url={material.url} title={material.title} />
            )}
          </section>
        );
      })}
    </div>
  );
}
