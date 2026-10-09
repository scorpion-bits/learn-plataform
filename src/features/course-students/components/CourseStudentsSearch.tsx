'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button, Input } from '@/components/ui';

import styles from './CourseStudents.module.css';

const DEBOUNCE_MS = 350;

/** GET form (funciona sem JS) + debounce; mantém `tab=students` e volta à página 1. */
export function CourseStudentsSearch({ basePath, initial }: { basePath: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const last = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: string) {
    const q = next.trim();
    if (q === last.current) return;
    last.current = q;
    const params = new URLSearchParams({ tab: 'students' });
    if (q) params.set('q', q);
    router.replace(`${basePath}?${params.toString()}`);
  }

  return (
    <form
      action={basePath}
      method="get"
      role="search"
      className={styles.search}
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        go(value);
      }}
    >
      <input type="hidden" name="tab" value="students" />
      <label className="visually-hidden" htmlFor="course-student-q">
        Buscar aluno do curso por nome ou email
      </label>
      <Input
        id="course-student-q"
        name="q"
        type="search"
        value={value}
        placeholder="Buscar por nome ou email"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go(e.target.value), DEBOUNCE_MS);
        }}
      />
      <Button type="submit" variant="secondary">
        Buscar
      </Button>
    </form>
  );
}
