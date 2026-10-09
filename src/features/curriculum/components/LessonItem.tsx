'use client';

import { useId, useRef, useState } from 'react';

import { Button, IconButton, Input, Switch } from '@/components/ui';

import { parseMinutes, secondsToMinutes } from '../constants';
import type { CurriculumLesson } from '../queries';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, TrashIcon } from './icons';
import styles from './CurriculumEditor.module.css';
import { TitleForm } from './TitleForm';

interface Props {
  courseId: string;
  lesson: CurriculumLesson;
  /** "1.2" */
  number: string;
  index: number;
  count: number;
  onMove: (index: number, delta: -1 | 1) => void;
  onRename: (title: string) => Promise<string | null>;
  onPreview: (value: boolean) => void;
  onDuration: (minutes: number | null) => Promise<string | null>;
  onDelete: () => void;
}

function DurationField({
  title,
  durationSeconds,
  onSave,
}: {
  title: string;
  durationSeconds: number | null;
  onSave: (minutes: number | null) => Promise<string | null>;
}) {
  const errorId = useId();
  const current = secondsToMinutes(durationSeconds);
  const initial = current === null ? '' : String(current);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const lastSent = useRef<number | null | undefined>(current);

  async function save() {
    const minutes = parseMinutes(value);
    if (minutes === undefined) {
      setError('Use minutos inteiros (ex.: 12).');
      return;
    }
    if (minutes === lastSent.current) {
      setError(null);
      return;
    }
    lastSent.current = minutes;
    const message = await onSave(minutes);
    if (message) {
      lastSent.current = current;
      setError(message);
      setValue(initial);
    } else {
      setError(null);
    }
  }

  return (
    <form
      className={styles.duration}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input
        className={styles.durationInput}
        aria-label={`Duração em minutos: ${title}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={4}
        placeholder="0"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onBlur={() => void save()}
      />
      <span className={styles.durationUnit} aria-hidden="true">
        min
      </span>
      {error ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function LessonItem({
  courseId,
  lesson,
  number,
  index,
  count,
  onMove,
  onRename,
  onPreview,
  onDuration,
  onDelete,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const renameId = `rename-lesson-${lesson.id}`;

  function closeRename() {
    setRenaming(false);
    requestAnimationFrame(() => document.getElementById(renameId)?.focus());
  }

  return (
    <li className={styles.lesson}>
      <div className={styles.lessonHead}>
        {renaming ? (
          <TitleForm
            label={`Novo título da aula ${number}`}
            submitLabel="Salvar"
            initialValue={lesson.title}
            autoFocus
            onSubmit={onRename}
            onCancel={closeRename}
            onDone={closeRename}
          />
        ) : (
          <p className={styles.lessonTitle}>
            <span className={styles.number}>{number}</span> {lesson.title}
          </p>
        )}
        <div className={styles.actions}>
          <IconButton
            id={`move-lesson-${lesson.id}-up`}
            size="sm"
            aria-label={`Mover aula "${lesson.title}" para cima`}
            icon={<ArrowUpIcon />}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          />
          <IconButton
            id={`move-lesson-${lesson.id}-down`}
            size="sm"
            aria-label={`Mover aula "${lesson.title}" para baixo`}
            icon={<ArrowDownIcon />}
            disabled={index === count - 1}
            onClick={() => onMove(index, 1)}
          />
          <IconButton
            id={renameId}
            size="sm"
            aria-label={`Renomear aula "${lesson.title}"`}
            icon={<PencilIcon />}
            aria-expanded={renaming}
            onClick={() => setRenaming(true)}
          />
          <IconButton
            size="sm"
            aria-label={`Excluir aula "${lesson.title}"`}
            icon={<TrashIcon />}
            onClick={onDelete}
          />
        </div>
      </div>
      <div className={styles.lessonMeta}>
        <DurationField
          key={lesson.durationSeconds ?? 'none'}
          title={lesson.title}
          durationSeconds={lesson.durationSeconds}
          onSave={onDuration}
        />
        <Switch
          label="Prévia gratuita"
          checked={lesson.isPreview}
          onChange={(e) => onPreview(e.target.checked)}
        />
        <Button
          variant="ghost"
          size="sm"
          href={`/admin/cursos/${courseId}/aulas/${lesson.id}`}
          aria-label={`Materiais da aula "${lesson.title}" (${lesson.materialCount})`}
        >
          {`Materiais (${lesson.materialCount})`}
        </Button>
      </div>
    </li>
  );
}
