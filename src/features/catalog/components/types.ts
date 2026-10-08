import type { CatalogCourse } from '../model';

/** Curso + URL pública da capa (resolvida no servidor; os componentes não leem env). */
export type CourseView = CatalogCourse & { coverUrl: string | null };
