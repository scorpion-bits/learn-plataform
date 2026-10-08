import { ErrorState } from '@/components/ui';

import { getCurriculum } from '../queries';
import { CurriculumEditor } from './CurriculumEditor';

/** Server Component: carrega a ementa e entrega ao editor (erro de leitura vira ErrorState). */
export async function SyllabusPanel({ courseId }: { courseId: string }) {
  let modules;
  try {
    modules = await getCurriculum(courseId);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar a ementa"
        message="Recarregue a página para tentar novamente."
      />
    );
  }
  return <CurriculumEditor courseId={courseId} modules={modules} />;
}
