import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PlayerShell } from '@/components/layout';
import { Button } from '@/components/ui';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Vitrine · PlayerShell',
  robots: { index: false, follow: false },
};

const MODULES = [
  {
    title: '1. Primeiros passos',
    lessons: ['Instalando a Godot', 'Cenas e nós', 'Seu primeiro script'],
  },
  { title: '2. Movimento', lessons: ['Input do jogador', 'Física 2D', 'Animações'] },
  { title: '3. Publicando', lessons: ['Exportar para web', 'Itch.io'] },
];

// Vitrine do PlayerShell com dados fictícios (404 em produção). O player real é PLAYER-00x.
export default function PlayerShowcasePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const outline = (
    <nav aria-label="Módulos e aulas">
      <ol className={styles.modules}>
        {MODULES.map((mod) => (
          <li key={mod.title}>
            <h3 className={styles.moduleTitle}>{mod.title}</h3>
            <ol className={styles.lessons}>
              {mod.lessons.map((lesson) => {
                const current = lesson === 'Cenas e nós';
                return (
                  <li key={lesson}>
                    <a
                      href="#aula"
                      className={styles.lesson}
                      aria-current={current ? 'page' : undefined}
                    >
                      {lesson}
                    </a>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <PlayerShell
      backHref="/dev/brand"
      courseTitle="Godot do zero: seu primeiro jogo com um título bem comprido para testar o truncamento"
      progress={{ total: 20, completed: 7 }}
      outline={outline}
      prev={
        <Button variant="secondary" href="#anterior">
          Anterior
        </Button>
      }
      complete={<Button>Concluir aula</Button>}
      next={
        <Button variant="secondary" href="#proxima">
          Próxima
        </Button>
      }
    >
      <article id="aula">
        <p className={styles.eyebrow}>Módulo 1 · Aula 2</p>
        <h1 className={styles.title}>Cenas e nós</h1>
        <div className={styles.video} role="img" aria-label="Espaço do vídeo da aula (fictício)">
          Vídeo 16:9
        </div>
        <p className={styles.text}>
          Tudo na Godot é um nó, e nós organizados em árvore formam uma cena. Nesta aula você monta
          a cena do jogador e entende como reaproveitar cenas dentro de outras.
        </p>
        <p className={styles.text}>
          Conteúdo fictício apenas para validar a área central do PlayerShell (largura máxima de
          960px), a rolagem independente e a barra de ações fixa.
        </p>
        <p className={styles.text}>
          Role esta área: o topo, a ementa e a barra de ações permanecem no lugar.
        </p>
        <p className={styles.text}>
          Mais um parágrafo de texto para garantir rolagem em telas altas e conferir o respiro final
          acima da barra inferior, inclusive com a área segura do celular.
        </p>
      </article>
    </PlayerShell>
  );
}
