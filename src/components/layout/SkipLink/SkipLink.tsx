import { MAIN_ID } from '../types';
import styles from './SkipLink.module.css';

/** Primeiro foco da página: pula a navegação até o <main id="conteudo">. */
export function SkipLink() {
  return (
    <a className={styles.skip} href={`#${MAIN_ID}`}>
      Pular para o conteúdo
    </a>
  );
}
