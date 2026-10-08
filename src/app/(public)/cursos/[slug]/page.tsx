import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CourseView } from '@/features/catalog/components/CourseView';
import { descriptionToBlocks } from '@/features/catalog/model';
import { withCover } from '@/features/catalog/presenters';
import { getCoursePage, getPublishedCourse } from '@/features/catalog/queries';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourse(slug);
  if (!course) return { title: 'Curso não encontrado', robots: { index: false } };

  const { coverUrl } = withCover(course);
  const description =
    course.subtitle ??
    descriptionToBlocks(course.description)
      .find((b) => b.type === 'p')
      ?.text.slice(0, 200) ??
    'Curso de game dev da Scorpion Bits.';

  return {
    title: course.title,
    description,
    alternates: { canonical: `/cursos/${course.slug}` },
    openGraph: {
      type: 'website',
      title: course.title,
      description,
      url: `/cursos/${course.slug}`,
      ...(coverUrl ? { images: [{ url: coverUrl, alt: `Capa do curso ${course.title}` }] } : {}),
    },
    twitter: {
      card: coverUrl ? 'summary_large_image' : 'summary',
      title: course.title,
      description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
  };
}

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getCoursePage(slug);
  if (!data) notFound();

  return (
    <CourseView
      course={withCover(data.course)}
      outline={data.outline}
      signedIn={data.signedIn}
      hasAccess={data.hasAccess}
    />
  );
}
