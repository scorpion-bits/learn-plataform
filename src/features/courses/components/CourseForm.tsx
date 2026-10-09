'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { Button, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import type { ActionResult } from '@/lib/auth/actions';

import { createCourse, updateCourse } from '../actions';
import { COURSE_LEVELS, LEVEL_LABELS, slugify } from '../constants';
import { CoverUploader } from './CoverUploader';
import styles from './CourseForm.module.css';

export interface CourseFormValues {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  categoryId: string;
  level: string;
  /** Preço já formatado ("197,00"). */
  price: string;
  coverPath: string;
  coverUrl: string | null;
}

interface Props {
  categories: { id: string; name: string }[];
  /** Ausente = criação. */
  course?: CourseFormValues;
}

type State = ActionResult<{ id: string }> | null;

export function CourseForm({ categories, course }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(course);

  const [title, setTitle] = useState(course?.title ?? '');
  const [slug, setSlug] = useState(course?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [coverPath, setCoverPath] = useState(course?.coverPath ?? '');

  const [state, formAction, pending] = useActionState<State, FormData>(async (_prev, formData) => {
    return isEdit ? updateCourse(formData) : createCourse(formData);
  }, null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (isEdit) {
        toast({ tone: 'success', title: 'Curso salvo' });
        router.refresh();
      } else {
        toast({
          tone: 'success',
          title: 'Curso criado',
          description: 'Agora adicione a capa e a ementa.',
        });
        router.push(`/admin/cursos/${state.data.id}`);
      }
    } else {
      toast({ tone: 'error', title: 'Não foi possível salvar', description: state.error });
      // O toast não rouba o foco: leva o teclado ao primeiro campo inválido.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage apenas a um novo resultado
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const err = (name: string) => errors[name]?.[0];

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      {course && <input type="hidden" name="id" value={course.id} />}
      {course && <input type="hidden" name="coverPath" value={coverPath} />}

      <Field label="Título" required error={err('title')}>
        <Input
          name="title"
          value={title}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="next"
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>

      <Field
        label="Endereço (slug)"
        required
        hint={`Aparece na URL: /cursos/${slug || 'meu-curso'}`}
        error={err('slug')}
      >
        <Input
          name="slug"
          value={slug}
          maxLength={100}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </Field>

      <Field label="Subtítulo" hint="Linha curta que aparece no card." error={err('subtitle')}>
        <Input name="subtitle" defaultValue={course?.subtitle ?? ''} maxLength={300} />
      </Field>

      <Field
        label="Descrição"
        hint="Markdown simples: **negrito**, listas com -, links."
        error={err('description')}
      >
        <Textarea name="description" rows={8} defaultValue={course?.description ?? ''} />
      </Field>

      <div className={styles.row}>
        <Field label="Categoria" error={err('categoryId')}>
          <Select name="categoryId" defaultValue={course?.categoryId ?? ''}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nível" required error={err('level')}>
          <Select name="level" defaultValue={course?.level ?? 'beginner'}>
            {COURSE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Preço (R$)" hint="Obrigatório para publicar." error={err('price')}>
          <Input
            name="price"
            inputMode="decimal"
            defaultValue={course?.price ?? ''}
            placeholder="197,00"
            autoComplete="off"
          />
        </Field>
      </div>

      {course ? (
        <div className={styles.cover}>
          <span className={styles.label}>Capa</span>
          <CoverUploader
            courseId={course.id}
            title={title}
            initialUrl={course.coverUrl}
            value={coverPath}
            onChange={(path) => setCoverPath(path)}
          />
          {err('coverPath') && (
            <p className={styles.error} role="alert">
              {err('coverPath')}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.note}>Você poderá enviar a capa logo depois de criar o curso.</p>
      )}

      <div className={styles.actions}>
        <Button type="submit" pending={pending}>
          {isEdit ? 'Salvar alterações' : 'Criar curso'}
        </Button>
        <Button variant="ghost" href="/admin/cursos">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
