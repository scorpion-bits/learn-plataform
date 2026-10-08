import { displayHost } from '../../model';
import { ExternalIcon } from '../icons';

import styles from './Materials.module.css';

export interface LinkMaterialProps {
  /** URL já validada (http/https) por `safeExternalUrl`. */
  url: string;
  title: string | null;
}

/** Card de link externo: abre em nova aba, sem `opener` nem `referrer`. */
export function LinkMaterial({ url, title }: LinkMaterialProps) {
  const host = displayHost(url);
  return (
    <a
      className={`${styles.card} ${styles.linkCard}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.cardIcon} aria-hidden="true">
        <ExternalIcon />
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardTitle}>{title ?? host}</span>
        <span className={styles.cardMeta}>{host}</span>
      </span>
      <span className={styles.srOnly}>(abre em nova aba)</span>
    </a>
  );
}
