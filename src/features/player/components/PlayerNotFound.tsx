import { Button, EmptyState } from '@/components/ui';

import styles from './PlayerView.module.css';

/** 404 elegante do player: curso ou aula inexistente (ou fora do alcance da RLS). */
export function PlayerNotFound() {
  return (
    <main className={styles.screen}>
      <div className={styles.screenBody}>
        <EmptyState
          title="Aula não encontrada"
          description="O link pode estar errado, ou a aula foi removida ou ainda não está disponível para você."
          action={
            <div className={styles.screenActions}>
              <Button href="/minha-biblioteca">Minha biblioteca</Button>
              <Button variant="secondary" href="/cursos">
                Ver cursos
              </Button>
            </div>
          }
        />
      </div>
    </main>
  );
}
