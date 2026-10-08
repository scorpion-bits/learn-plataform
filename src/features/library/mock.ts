import type { LibraryCardCourse } from './components/LibraryCard';

/** Dados fictícios da biblioteca, só para as vitrines `/dev/inicio` e `/dev/biblioteca`. */
const base = {
  subtitle: null,
  coverPath: null,
  coverUrl: null,
  firstGrantedAt: '2026-01-10T12:00:00Z',
};

export const MOCK_LIBRARY: LibraryCardCourse[] = [
  {
    ...base,
    courseId: 'c1',
    slug: 'godot-do-zero',
    title: 'Godot do zero: seu primeiro jogo',
    lessonCount: 20,
    completedCount: 7,
    progressPercent: 35,
    isCompleted: false,
    origin: 'purchase',
    lastAccessedAt: '2026-10-07T20:00:00Z',
    lastLessonId: 'l7',
  },
  {
    ...base,
    courseId: 'c2',
    slug: 'pixel-art-para-jogos',
    title: 'Pixel art para jogos',
    lessonCount: 12,
    completedCount: 12,
    progressPercent: 100,
    isCompleted: true,
    origin: 'admin_grant',
    lastAccessedAt: '2026-09-20T20:00:00Z',
    lastLessonId: 'l12',
  },
  {
    ...base,
    courseId: 'c3',
    slug: 'game-design-essencial',
    title: 'Game design essencial com um título bem comprido para testar quebra de linha',
    lessonCount: 30,
    completedCount: 0,
    progressPercent: 0,
    isCompleted: false,
    origin: 'purchase',
    firstGrantedAt: '2026-10-01T12:00:00Z',
    lastAccessedAt: null,
    lastLessonId: null,
  },
];

export const MOCK_LESSON_TITLE = 'Cenas e nós';
