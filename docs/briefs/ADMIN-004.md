# ADMIN-004 — Editor de materiais da aula

**Agente:** A05 Admin · **Modelo:** Sonnet 5.5 · **Esforço:** alto

## Objetivo
Página `/admin/cursos/[id]/aulas/[lessonId]` para adicionar, editar, remover e reordenar materiais da aula: `video`, `text`, `file`, `link` (sem PDF — ADR-020).

## Leia (somente isto)
- `CLAUDE.md`
- `docs/backlog.md` → seção `ADMIN-004`
- `supabase/migrations/20261008000001_core_schema.sql` → só a tabela `lesson_materials` e seus checks (grep)
- `docs/database.md` §6 (storage `course-content`: MIME permitidos, limite) e função `reorder_materials` (grep)
- Padrão a copiar: `src/features/curriculum/{actions,schemas}.ts` e `src/features/courses/components/CoverUploader*` (upload com progresso/cancelar)
- Componentes: `src/components/ui/index.ts`

## Regras
- `video`: admin cola URL do YouTube/Vimeo; o servidor extrai `video_provider` + `video_id` (respeitar o check do banco: `[A-Za-z0-9_-]`, Vimeo `id/hash`); rejeitar outras URLs.
- `text`: markdown em textarea com prévia simples (parágrafos/títulos/listas/código como texto escapado — sem lib nova, sem HTML cru).
- `file`: upload para `course-content` em `<courseId>/<lessonId>/<uuid>-<nome-sanitizado>`; valida tipo/tamanho no cliente **e** no servidor (action confere prefixo do caminho, `file_size`, `mime_type` permitido); progresso + cancelar; ao excluir material ou trocar arquivo, remover o objeto antigo.
- `link`: só `http(s)://`, título obrigatório.
- Trocar o tipo de um material = excluir e criar outro (os checks proíbem campos de outros tipos).
- Reordenação via `rpc('reorder_materials')`, ↑/↓ acessíveis, `useOptimistic` com rollback.
- Breadcrumb: Cursos › <curso> › Ementa › <aula>; `notFound()` se a aula não pertencer ao curso.

## Critérios de aceite
- Todas as mutações via `adminAction` + zod; IDs uuid.
- Loading/empty/error; 360px por toque; teclado.
- Testes (Supabase mockado): não-admin rejeitado; parse de URL de vídeo (válidas/maliciosas); caminho de arquivo fora do prefixo rejeitado; reorder; exclusão remove storage.
- `lint`, `typecheck`, `test`, `build` passam sem env.

## Não fazer
- Não editar migrations, `src/lib/*`, `src/features/auth|courses|catalog/`, `src/app/(public)|(auth)/`, `src/components/ui|brand`, `MASTER_PLAN.md`, `docs/changelog.md`.
- Sem dependências novas, commit/push ou `prettier --write .`.

## Relatório final
Arquivos · decisões · testes · pendências.
