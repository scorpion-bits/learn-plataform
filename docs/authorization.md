# Autorização

## Papéis
| papel | origem | capacidades |
|---|---|---|
| `student` | automático no cadastro | ver catálogo, comprar, consumir cursos com acesso, registrar o próprio progresso, editar o próprio perfil |
| `admin` | **somente** via SQL/service role (`supabase/scripts/grant-admin.sql`) | tudo acima + gerenciar cursos/conteúdo, alunos, matrículas, pedidos, métricas |

Anônimo: catálogo e páginas de curso publicados, ementa pública, materiais de aulas `is_preview`.

## Camadas (todas obrigatórias)
1. **Banco (RLS + funções)** — a única camada que um atacante não contorna.
2. **Servidor Next** — `requireUser`/`requireAdmin` em layouts **e** em cada Server Action; validação `zod` de todo input.
3. **UI** — esconder o que não se pode fazer (conveniência, nunca segurança).

## Matriz de RLS (resumo)
| tabela | anon | student | admin |
|---|---|---|---|
| profiles | — | SELECT/UPDATE própria linha (colunas permitidas) | SELECT todos |
| user_roles | — | SELECT própria | SELECT todos (escrita só service role) |
| categories | SELECT | SELECT | ALL |
| courses | SELECT `published` | SELECT `published` (+ cursos com acesso mesmo se `archived`) | ALL |
| course_modules / lessons | SELECT se curso `published` (só metadados de ementa) | idem | ALL |
| lesson_materials | SELECT se aula `is_preview` e curso publicado | SELECT se `has_course_access(course_id)` ou preview | ALL |
| enrollments | — | SELECT próprias | ALL (INSERT `admin_grant`, UPDATE revogação) |
| orders | — | SELECT próprios. **Sem escrita direta**: pedidos são criados/atualizados apenas pelo servidor (Server Action `startCheckout` com service client em módulo `server-only`, após `requireUser` + zod; preço lido do banco) e pelo webhook | SELECT todos; venda manual via Server Action admin |
| payment_events | — | — | SELECT |
| lesson_progress | — | ALL nas próprias linhas **se** `has_course_access(course_id)` | SELECT todos |
| storage `course-covers` | SELECT | SELECT | ALL |
| storage `course-content` | — | — (signed URL do servidor) | ALL |

## Checklist "usuário malicioso" (aplicar a toda feature)
- [ ] Chamando a REST do Supabase direto com a publishable key e meu JWT, consigo ler/escrever algo fora do meu escopo?
- [ ] Chamando a Server Action direto (ela é um endpoint POST público) com IDs de outro usuário/curso, o que acontece?
- [ ] Trocar IDs na URL revela dados de outro usuário?
- [ ] Algum segredo está em `NEXT_PUBLIC_*` ou em bundle de client?
- [ ] Resposta com dado privado tem `Cache-Control: private, no-store`?
- [ ] Algum valor monetário vem do cliente? (Nunca deve.)

Toda tarefa que toca dados deve ter testes pgTAP de RLS (`supabase/tests/`) cobrindo pelo menos anon, student sem acesso, student com acesso e admin.
