-- FK direta lessons.course_id → courses.
-- A FK composta (module_id, course_id) → course_modules garante a consistência,
-- mas o PostgREST só enxerga relações por FK direta: sem esta, `courses?select=lessons(count)`
-- falha com PGRST200 ("Could not find a relationship between 'courses' and 'lessons'").
-- Não muda regras de acesso; o cascade é redundante com o de course_modules.

alter table public.lessons
  add constraint lessons_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;
