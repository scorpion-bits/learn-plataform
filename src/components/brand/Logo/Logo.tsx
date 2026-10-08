import Image from 'next/image';
import Link from 'next/link';

import styles from './Logo.module.css';

export type LogoSize = 'sm' | 'md' | 'lg';

/** largura do glyph em px (147x180 => altura = largura * 180/147) e fonte do wordmark */
const GLYPH: Record<LogoSize, number> = { sm: 20, md: 25, lg: 36 };

export interface LogoProps {
  size?: LogoSize;
  /** Destino do link; `null` renderiza sem link (ex.: rodapé, telas de login). */
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
}

/**
 * Marca: glyph do escorpião (branco, legível em 20–36px; o logo-mark colorido
 * perde o contorno navy sobre fundo escuro) + "Scorpion Bits" + "Learn" em
 * ciano, estilo `.dock-brand` do site.
 */
export function Logo({ size = 'md', href = '/', showWordmark = true, className }: LogoProps) {
  const w = GLYPH[size];
  const h = Math.round((w * 180) / 147);
  const classes = [styles.logo, styles[size], className].filter(Boolean).join(' ');

  const content = (
    <>
      <Image
        className={styles.glyph}
        src="/brand/logo-glyph.png"
        width={w}
        height={h}
        alt=""
        unoptimized
        priority
      />
      {showWordmark && (
        <span className={styles.word}>
          Scorpion Bits <em>Learn</em>
        </span>
      )}
    </>
  );

  if (href === null) {
    return (
      <span
        className={classes}
        role={showWordmark ? undefined : 'img'}
        aria-label={showWordmark ? undefined : 'Scorpion Bits Learn'}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      aria-label={showWordmark ? undefined : 'Scorpion Bits Learn — página inicial'}
    >
      {content}
    </Link>
  );
}
