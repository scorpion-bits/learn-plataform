import type { CourseView } from './components/types';
import type { OutlineModule } from './model';

/** Dados fictícios só para as vitrines /dev/catalog (nunca importado por rotas reais). */
export const MOCK_CATEGORIES = [
  { slug: 'programacao', name: 'Programação' },
  { slug: 'arte', name: 'Arte e animação' },
  { slug: 'design', name: 'Game design' },
];

function course(
  partial: Partial<CourseView> & Pick<CourseView, 'id' | 'slug' | 'title'>,
): CourseView {
  return {
    subtitle: null,
    description: null,
    level: 'beginner',
    priceCents: 19700,
    coverPath: null,
    coverUrl: null,
    categorySlug: 'programacao',
    categoryName: 'Programação',
    moduleCount: 3,
    lessonCount: 24,
    durationSeconds: 3600 * 6 + 20 * 60,
    ...partial,
  };
}

export const MOCK_COURSES: CourseView[] = [
  course({
    id: '1',
    slug: 'godot-do-zero',
    title: 'Godot do zero ao primeiro jogo',
    subtitle: 'Monte um platformer completo e publique no itch.io.',
    description:
      'Neste curso você constrói um **platformer 2D** do zero.\n\n## O que você vai aprender\n\n- Cenas, nós e sinais\n- Física e colisão\n- Publicação\n\nSem pré-requisitos: só vontade de criar.',
    moduleCount: 3,
    lessonCount: 8,
    durationSeconds: 3600 * 2 + 25 * 60,
  }),
  course({
    id: '2',
    slug: 'pixel-art-essencial',
    title: 'Pixel art essencial',
    subtitle: 'Sprites, paletas e animação quadro a quadro.',
    level: 'intermediate',
    priceCents: 14900,
    categorySlug: 'arte',
    categoryName: 'Arte e animação',
    lessonCount: 18,
  }),
  course({
    id: '3',
    slug: 'game-design-sistemas',
    title: 'Game design de sistemas e economia',
    subtitle: 'Balanceamento, loops de progressão e telemetria.',
    level: 'advanced',
    priceCents: 29700,
    categorySlug: 'design',
    categoryName: 'Game design',
    lessonCount: 32,
    durationSeconds: 3600 * 11,
  }),
  course({
    id: '4',
    slug: 'unity-multiplayer',
    title: 'Multiplayer com Unity',
    subtitle: 'Netcode, lobbies e sincronização de estado.',
    level: 'advanced',
    priceCents: 34900,
    lessonCount: 27,
    durationSeconds: 3600 * 9 + 40 * 60,
  }),
  course({
    id: '5',
    slug: 'introducao-gamedev',
    title: 'Introdução ao desenvolvimento de jogos',
    subtitle: 'Do conceito ao protótipo jogável em um fim de semana.',
    priceCents: 0,
    categorySlug: 'design',
    categoryName: 'Game design',
    lessonCount: 6,
    durationSeconds: 3600,
  }),
];

export const MOCK_OUTLINE: OutlineModule[] = [
  {
    id: 'm1',
    title: 'Primeiros passos',
    lessons: [
      {
        id: 'l1',
        title: 'Boas-vindas e visão geral',
        summary: null,
        durationSeconds: 260,
        isPreview: true,
      },
      {
        id: 'l2',
        title: 'Instalando o Godot',
        summary: null,
        durationSeconds: 540,
        isPreview: true,
      },
      {
        id: 'l3',
        title: 'Cenas, nós e a árvore de cena',
        summary: null,
        durationSeconds: 1320,
        isPreview: false,
      },
    ],
  },
  {
    id: 'm2',
    title: 'Personagem e movimento',
    lessons: [
      {
        id: 'l4',
        title: 'CharacterBody2D e gravidade',
        summary: null,
        durationSeconds: 1500,
        isPreview: false,
      },
      {
        id: 'l5',
        title: 'Pulo variável e coyote time',
        summary: null,
        durationSeconds: 1380,
        isPreview: false,
      },
    ],
  },
  {
    id: 'm3',
    title: 'Publicação',
    lessons: [
      {
        id: 'l6',
        title: 'Exportando para web',
        summary: null,
        durationSeconds: 900,
        isPreview: false,
      },
      {
        id: 'l7',
        title: 'Publicando no itch.io',
        summary: null,
        durationSeconds: 780,
        isPreview: false,
      },
    ],
  },
];
