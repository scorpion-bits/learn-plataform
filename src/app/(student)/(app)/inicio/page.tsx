import type { Metadata } from 'next';

import { ChamferCard, CubeProgress, IsoCover } from '@/components/brand';
import { Badge } from '@/components/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Início' };

// Placeholder para validar o StudentShell (dados fictícios). A tela real é STUDENT-00x.
export default function InicioPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Área do aluno</p>
        <h1 className={styles.title}>Olá, Ana</h1>
        <p className={styles.lead}>Continue de onde parou.</p>
      </header>
      <ChamferCard>
        <div className={styles.card}>
          <div className={styles.cover}>
            <IsoCover title="Godot do zero" tone="cyan" />
          </div>
          <div className={styles.info}>
            <Badge tone="cyan">Em andamento</Badge>
            <h2>Godot do zero: seu primeiro jogo</h2>
            <p className={styles.lead}>Próxima aula: Cenas e nós</p>
            <CubeProgress total={20} completed={7} label="Progresso no curso" />
          </div>
        </div>
      </ChamferCard>
    </div>
  );
}
