import 'server-only';

import { getCoverPublicUrl } from '@/features/materials/storage';

import type { CourseView } from './components/types';
import type { CatalogCourse } from './model';

/** Resolve a URL pública da capa (lê env no servidor; falha de env = sem capa). */
export function withCover(course: CatalogCourse): CourseView {
  let coverUrl: string | null = null;
  try {
    coverUrl = getCoverPublicUrl(course.coverPath);
  } catch {
    coverUrl = null;
  }
  return { ...course, coverUrl };
}
