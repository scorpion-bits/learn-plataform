import Image from 'next/image';

import { ChamferCard, IsoCube } from '@/components/brand';
import type { IsoCubeState, IsoCubeTone } from '@/components/brand';
import { Button } from '@/components/ui';
import { CourseCard } from '@/features/catalog/components/CourseCard';
import type { CourseView } from '@/features/catalog/components/types';

import styles from './LandingView.module.css';

export interface LandingViewProps {
  /** Troca "Criar conta" por "Minha biblioteca". */
  signedIn: boolean;
  /** Até 3 cursos publicados; vazio = a seção some. */
  courses: CourseView[];
}

/** Cubos soltos em volta do escorpião: posição em %, tamanho em px, deriva por CSS. */
const HERO_CUBES: ReadonlyArray<{
  size: number;
  tone: IsoCubeTone;
  state: IsoCubeState;
  top: string;
  left: string;
  delay: string;
}> = [
  { size: 44, tone: 'cyan', state: 'active', top: '4%', left: '6%', delay: '0s' },
  { size: 26, tone: 'amber', state: 'filled', top: '14%', left: '84%', delay: '-2s' },
  { size: 34, tone: 'violet', state: 'filled', top: '58%', left: '0%', delay: '-4s' },
  { size: 22, tone: 'mint', state: 'filled', top: '74%', left: '88%', delay: '-1s' },
  { size: 30, tone: 'cyan', state: 'empty', top: '88%', left: '22%', delay: '-3s' },
];

const STEPS: ReadonlyArray<{
  title: string;
  text: string;
  state: IsoCubeState;
  tone: IsoCubeTone;
}> = [
  {
    title: 'Escolha seu curso',
    text: 'Cada trilha tem nível, carga horária e preço claros. Comece pelo que faz sentido para o jogo que você quer fazer.',
    state: 'empty',
    tone: 'cyan',
  },
  {
    title: 'Aprenda no seu ritmo',
    text: 'Aulas em vídeo e material de apoio, no computador ou no celular. Pause, volte e continue de onde parou.',
    state: 'filled',
    tone: 'cyan',
  },
  {
    title: 'Publique seu jogo',
    text: 'Você termina com um projeto jogável, pronto para mostrar ao mundo, e cada aula concluída acende um cubo.',
    state: 'active',
    tone: 'amber',
  },
];

export function LandingView({ signedIn, courses }: LandingViewProps) {
  return (
    <div className={styles.page}>
      {/* ------------------------------------------------------------ hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Estúdio de jogos indie · Cursos de game dev</p>
          <h1 id="hero-title" className={styles.title}>
            Aprenda a criar jogos com <em>quem faz jogos</em>
          </h1>
          <p className={styles.lead}>
            Cursos feitos pelo estúdio Scorpion Bits: do zero ao seu primeiro projeto publicado, com
            projetos de verdade e no seu ritmo.
          </p>
          <div className={styles.actions}>
            <Button href="/cursos" size="lg">
              Ver cursos
            </Button>
            {signedIn ? (
              <Button href="/minha-biblioteca" variant="secondary" size="lg">
                Minha biblioteca
              </Button>
            ) : (
              <Button href="/cadastro" variant="secondary" size="lg">
                Criar conta
              </Button>
            )}
          </div>
        </div>

        <div className={styles.stage} aria-hidden="true">
          <span className={styles.floor} />
          <Image
            className={styles.mascot}
            src="/brand/logo-poster.png"
            width={320}
            height={426}
            sizes="(max-width: 1023px) 240px, 340px"
            alt=""
            preload
            fetchPriority="high"
          />
          {HERO_CUBES.map((cube, i) => (
            <span
              key={i}
              className={styles.floater}
              style={{ top: cube.top, left: cube.left, animationDelay: cube.delay }}
            >
              <IsoCube size={cube.size} tone={cube.tone} state={cube.state} />
            </span>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- como funciona */}
      <section className={styles.section} aria-labelledby="como-funciona">
        <header className={styles.sectionHead}>
          <p className={styles.eyebrow}>Como funciona</p>
          <h2 id="como-funciona" className={styles.h2}>
            Três passos, um cubo de cada vez
          </h2>
        </header>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <ChamferCard as="li" key={step.title} shape="face" tilt={i % 2 ? 'left' : 'right'}>
              <div className={styles.step}>
                <div className={styles.stepHead}>
                  <IsoCube size={48} state={step.state} tone={step.tone} />
                  <span className={styles.stepNum}>Passo {String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className={styles.h3}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </ChamferCard>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ cursos em destaque */}
      {courses.length > 0 && (
        <section className={styles.section} aria-labelledby="cursos-destaque">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Cursos</p>
            <h2 id="cursos-destaque" className={styles.h2}>
              Comece por aqui
            </h2>
          </header>
          <ul className={styles.courses}>
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </ul>
          <p className={styles.more}>
            <Button href="/cursos" variant="secondary">
              Ver todos os cursos
            </Button>
          </p>
        </section>
      )}

      {/* -------------------------------------------------- estúdio / GameLab */}
      <section className={styles.section} aria-labelledby="estudio">
        <div className={styles.studio}>
          <div className={styles.studioText}>
            <p className={styles.eyebrow}>Sobre o estúdio</p>
            <h2 id="estudio" className={styles.h2}>
              Quem ensina também publica jogos
            </h2>
            <p className={styles.studioP}>
              A Scorpion Bits é um estúdio de jogos indie focado em mecânicas polidas e direção de
              arte própria. O que ensinamos aqui é o que usamos no dia a dia.
            </p>
            <p className={styles.studioP}>
              Nasceu no <strong>GameLab</strong>, nosso curso presencial no SESC Araraquara: 15
              encontros, do zero absoluto até um jogo 2D completo em Godot, com um material escrito
              para quem nunca programou.
            </p>
          </div>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <IsoCube size={28} tone="cyan" />
              <dt>Turma</dt>
              <dd>GameLab · SESC Araraquara</dd>
            </div>
            <div className={styles.fact}>
              <IsoCube size={28} tone="mint" />
              <dt>Encontros</dt>
              <dd>15, presenciais</dd>
            </div>
            <div className={styles.fact}>
              <IsoCube size={28} tone="amber" />
              <dt>Engine</dt>
              <dd>Godot · GDScript</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA final */}
      <section className={styles.section} aria-labelledby="cta-final">
        <ChamferCard as="div" shape="face">
          <div className={styles.cta}>
            <div className={styles.ctaCubes} aria-hidden="true">
              <IsoCube size={36} state="filled" />
              <IsoCube size={36} state="filled" tone="violet" />
              <IsoCube size={36} state="active" tone="amber" />
            </div>
            <h2 id="cta-final" className={styles.h2}>
              Seu primeiro jogo começa no primeiro cubo
            </h2>
            <p className={styles.ctaText}>
              Veja os cursos, escolha o seu e comece hoje, direto do celular ou do computador.
            </p>
            <div className={styles.actions}>
              <Button href="/cursos" size="lg">
                Ver cursos
              </Button>
              {!signedIn && (
                <Button href="/cadastro" variant="secondary" size="lg">
                  Criar conta
                </Button>
              )}
            </div>
          </div>
        </ChamferCard>
      </section>
    </div>
  );
}
