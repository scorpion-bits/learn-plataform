import Image from 'next/image';

import styles from './page.module.css';

// Tela provisória "em construção" (a landing final é STUDENT-001).
export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image
          className={styles.mascot}
          src="/brand/logo-poster.png"
          width={320}
          height={426}
          alt="Mascote da Scorpion Bits: um escorpião feito de cubos isométricos"
          priority
        />
        <p className={styles.eyebrow}>Em construção</p>
        <h1 className={styles.title}>
          Scorpion Bits <em>Learn</em>
        </h1>
        <p className={styles.lead}>
          Estamos montando a plataforma de cursos do estúdio: aprenda a criar jogos com quem faz
          jogos, do zero ao seu primeiro projeto publicado. Volte em breve.
        </p>
        <p className={styles.foot}>Scorpion Bits · Estúdio de jogos indie</p>
      </div>
    </main>
  );
}
