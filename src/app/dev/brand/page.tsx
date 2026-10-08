import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ChamferCard,
  CubeProgress,
  Dock,
  DockLink,
  IsoCover,
  IsoCube,
  Logo,
} from '@/components/brand';
import type { IsoCubeState, IsoCubeTone } from '@/components/brand';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Vitrine · marca',
  robots: { index: false, follow: false },
};

const STATES: IsoCubeState[] = ['empty', 'filled', 'active', 'locked'];
const TONES: IsoCubeTone[] = ['cyan', 'mint', 'amber', 'violet'];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Vitrine temporária (UI-004). Só existe fora de produção. */
export default function BrandShowcasePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <Dock
        brand={<Logo />}
        nav={
          <>
            <DockLink href="/dev/brand" active>
              Cursos
            </DockLink>
            <DockLink href="/dev/brand#cubos">Biblioteca</DockLink>
            <DockLink href="/dev/brand#cards">Sobre</DockLink>
          </>
        }
        actions={
          <>
            <a className={styles.ghost} href="/dev/brand">
              Entrar
            </a>
            <a className={styles.solid} href="/dev/brand">
              Criar conta
            </a>
          </>
        }
      />

      <main className={styles.page}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>UI-004 · vitrine temporária</p>
          <h1 className={styles.title}>
            Componentes de <em>assinatura</em>
          </h1>
          <p className={styles.lead}>
            Cubo, trilha de progresso, card chanfrado, capa isométrica, logo e dock. Somente fora de
            produção.
          </p>
        </header>

        <Section id="cubos" title="IsoCube — estados × tons">
          <div className={styles.matrix}>
            {TONES.map((tone) => (
              <div key={tone} className={styles.row}>
                <span className={styles.rowLabel}>{tone}</span>
                {STATES.map((state) => (
                  <figure key={state} className={styles.cell}>
                    <IsoCube size={64} state={state} tone={tone} />
                    <figcaption>{state}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
          <div className={styles.inline}>
            {[12, 16, 20, 24, 32, 48].map((size) => (
              <IsoCube key={size} size={size} state="filled" />
            ))}
            <span className={styles.note}>12 · 16 · 20 · 24 · 32 · 48 px</span>
          </div>
        </Section>

        <Section id="progresso" title="CubeProgress">
          <div className={styles.stack}>
            <div className={styles.line}>
              <span className={styles.lineLabel}>0 de 12</span>
              <CubeProgress total={12} completed={0} />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>7 de 12</span>
              <CubeProgress total={12} completed={7} />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>12 de 12</span>
              <CubeProgress total={12} completed={12} tone="mint" />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>17 de 40 (agrupado)</span>
              <CubeProgress total={40} completed={17} />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>lg</span>
              <CubeProgress total={8} completed={3} size="lg" tone="amber" />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>sem rótulo</span>
              <CubeProgress total={6} completed={2} showLabel={false} size="sm" />
            </div>
            <div className={styles.line}>
              <span className={styles.lineLabel}>1 item</span>
              <CubeProgress total={1} completed={0} unit="módulos" unitSingular="módulo" />
            </div>
          </div>

          <p className={styles.note}>Topo do player (compacto, 360px):</p>
          <div className={styles.playerBar}>
            <span className={styles.playerTitle}>Godot do zero</span>
            <CubeProgress total={24} completed={9} size="sm" maxVisible={8} />
          </div>
        </Section>

        <Section id="cards" title="ChamferCard">
          <div className={styles.cards}>
            <ChamferCard as="article">
              <p className={styles.cardEyebrow}>Estático · article</p>
              <h3 className={styles.cardTitle}>Módulo 02 · Física 2D</h3>
              <p className={styles.cardText}>
                Conteúdo nunca é cortado pelo chanfro: o padding-top compensa a diagonal.
              </p>
            </ChamferCard>

            <ChamferCard href="/dev/brand">
              <p className={styles.cardEyebrow}>Link · interativo</p>
              <h3 className={styles.cardTitle}>Primeiro jogo em Godot</h3>
              <p className={styles.cardText}>
                A seta no rodapé indica que é clicável mesmo sem hover (celular).
              </p>
              <CubeProgress total={10} completed={4} size="sm" />
            </ChamferCard>

            <ChamferCard as="article" tilt="left" shape="face">
              <p className={styles.cardEyebrow}>tilt left · shape face</p>
              <h3 className={styles.cardTitle}>Paralelogramo</h3>
              <p className={styles.cardText}>A face lateral do cubo, como o .why-card.</p>
            </ChamferCard>

            <ChamferCard href="/dev/brand" padding="none">
              <div className={styles.media} aria-hidden="true" />
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>Mídia sangrando</h3>
                <p className={styles.cardText}>
                  padding=&quot;none&quot;: o chanfro recorta a mídia.
                </p>
              </div>
            </ChamferCard>
          </div>
        </Section>

        <Section id="capas" title="IsoCover">
          <div className={styles.covers}>
            <IsoCover
              src="/brand/og-cover.png"
              alt="Capa de exemplo do curso"
              sizes="(max-width: 720px) 100vw, 380px"
            />
            <IsoCover title="Introdução ao desenvolvimento de jogos com Godot" />
            <IsoCover title="Arte" tone="amber" />
            <IsoCover tone="mint" />
          </div>
        </Section>

        <Section id="logo" title="Logo">
          <div className={styles.inline}>
            <Logo size="sm" href={null} />
            <Logo size="md" href={null} />
            <Logo size="lg" href={null} />
            <Logo showWordmark={false} />
          </div>
        </Section>

        <p className={styles.note}>Role a página: o Dock gruda no topo e ganha borda/fundo.</p>
        <div className={styles.spacer} aria-hidden="true" />
      </main>
    </>
  );
}
