import type { Database } from '@/types/database';

/**
 * Regras puras da biblioteca do aluno (sem I/O; testáveis sem mocks).
 * A visão `my_library` (RLS do próprio usuário) já devolve uma linha por curso com matrícula
 * ativa e o progresso agregado; aqui só normalizamos, agrupamos e escolhemos o "continuar".
 */

export type LibraryRow = Database['public']['Views']['my_library']['Row'];

export type CourseOrigin = 'purchase' | 'admin_grant';

export const ORIGIN_LABEL: Record<CourseOrigin, string> = {
  purchase: 'Comprado',
  admin_grant: 'Atribuído',
};

export type LibraryCourse = {
  courseId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverPath: string | null;
  lessonCount: number;
  completedCount: number;
  /** 0..100 */
  progressPercent: number;
  isCompleted: boolean;
  /** Selo de origem: se houver compra E atribuição, vale "Comprado". */
  origin: CourseOrigin;
  firstGrantedAt: string | null;
  lastAccessedAt: string | null;
  /** Aula de retomada (última visitada), se houver. */
  lastLessonId: string | null;
};

/** "Comprado" ganha de "Atribuído" quando o aluno tem as duas matrículas. */
export function resolveOrigin(row: {
  sources?: readonly string[] | null;
  has_purchase?: boolean | null;
  has_admin_grant?: boolean | null;
}): CourseOrigin {
  if (row.has_purchase || row.sources?.includes('purchase')) return 'purchase';
  return 'admin_grant';
}

/** Linha da view -> curso. Linhas sem id/slug/título (view nula por tipagem) são descartadas. */
export function mapLibraryRow(row: LibraryRow): LibraryCourse | null {
  if (!row.course_id || !row.slug || !row.title) return null;
  const lessonCount = Math.max(0, row.lesson_count ?? 0);
  const completedCount = Math.min(lessonCount, Math.max(0, row.completed_count ?? 0));
  return {
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    coverPath: row.cover_path,
    lessonCount,
    completedCount,
    progressPercent: Math.min(100, Math.max(0, Math.round(row.progress_percent ?? 0))),
    isCompleted: row.is_completed === true,
    origin: resolveOrigin(row),
    firstGrantedAt: row.first_granted_at,
    lastAccessedAt: row.last_accessed_at,
    lastLessonId: row.last_lesson_id,
  };
}

/* ------------------------------------------------------------------ abas */

export const LIBRARY_TABS = ['em-andamento', 'concluidos', 'todos'] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];
export const DEFAULT_TAB: LibraryTab = 'em-andamento';

export const TAB_LABEL: Record<LibraryTab, string> = {
  'em-andamento': 'Em andamento',
  concluidos: 'Concluídos',
  todos: 'Todos',
};

/** `?aba=` -> aba válida; qualquer outra coisa cai na padrão. */
export function parseTab(value: string | string[] | undefined): LibraryTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return (LIBRARY_TABS as readonly string[]).includes(raw ?? '')
    ? (raw as LibraryTab)
    : DEFAULT_TAB;
}

const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

/** Mais recente primeiro: último acesso; sem acesso, data da matrícula; desempate por título. */
export function sortByRecency<T extends LibraryCourse>(courses: T[]): T[] {
  return [...courses].sort(
    (a, b) =>
      time(b.lastAccessedAt) - time(a.lastAccessedAt) ||
      time(b.firstGrantedAt) - time(a.firstGrantedAt) ||
      a.title.localeCompare(b.title, 'pt-BR'),
  );
}

/** Em andamento = ainda não concluído (inclui o que nunca foi aberto). */
export function filterByTab<T extends LibraryCourse>(courses: T[], tab: LibraryTab): T[] {
  const sorted = sortByRecency(courses);
  if (tab === 'concluidos') return sorted.filter((c) => c.isCompleted);
  if (tab === 'em-andamento') return sorted.filter((c) => !c.isCompleted);
  return sorted;
}

export function countByTab(courses: LibraryCourse[]): Record<LibraryTab, number> {
  const done = courses.filter((c) => c.isCompleted).length;
  return { 'em-andamento': courses.length - done, concluidos: done, todos: courses.length };
}

/* -------------------------------------------------------------- continuar */

/**
 * Curso de "Continuar de onde parou": entre os não concluídos, o de acesso mais recente
 * (quem nunca abriu fica depois, pela data da matrícula). Se tudo está concluído, o mais
 * recente de todos (o aluno ainda pode revisitar). `null` sem cursos.
 */
export function pickContinueCourse<T extends LibraryCourse>(courses: T[]): T | null {
  if (courses.length === 0) return null;
  const pending = courses.filter((c) => !c.isCompleted);
  return sortByRecency(pending.length > 0 ? pending : courses)[0] ?? null;
}

/** Destino do "Continuar": a aula de retomada, ou `/aprender/<slug>` (que resolve sozinho). */
export function continueHref(course: Pick<LibraryCourse, 'slug' | 'lastLessonId'>): string {
  return course.lastLessonId
    ? `/aprender/${course.slug}/${course.lastLessonId}`
    : `/aprender/${course.slug}`;
}

/** Primeiro nome para a saudação ("Ana Maria Souza" -> "Ana"); `null` se vazio. */
export function firstName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}
