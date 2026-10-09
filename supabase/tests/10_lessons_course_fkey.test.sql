-- 10 — FK direta lessons → courses (relação usada pelo PostgREST em `lessons(count)`)
begin;
select plan(2);

select fk_ok('public', 'lessons', 'course_id', 'public', 'courses', 'id',
  'lessons.course_id referencia courses.id diretamente');
select col_is_fk('public', 'lessons', array['module_id', 'course_id'],
  'FK composta para course_modules continua existindo');

select * from finish();
rollback;
