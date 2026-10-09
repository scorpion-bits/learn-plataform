# UX review — estados de rota e passe responsivo (UX-001 / UX-003)

Medido com Playwright (Chromium) em 360/390/768/1024/1440 px: `scrollWidth - innerWidth` e alvos de toque < 44px (links em texto corrido excluídos). Telas que exigem sessão/Supabase real (`/inicio`, `/conta`, `/admin/*`, `/aprender/*`) não foram medidas ao vivo; são cobertas pelas vitrines `/dev/*` correspondentes.

## UX-001 — loading / error / not-found

| Segmento | loading | error | not-found |
|---|---|---|---|
| `(auth)` (entrar, cadastro, recuperar/redefinir senha) | novo (grupo) | novo (grupo) | raiz |
| `(public)` (home, privacidade, termos) | novo (grupo) | novo (grupo) | raiz |
| `cursos`, `cursos/[slug]` | ok | ok | raiz |
| `(student)/(app)/*` (inicio, biblioteca, conta, pedidos, checkout) | ok | ok | novo `(app)/not-found.tsx` |
| `aprender/[courseSlug]` | ok | ok | ok (`PlayerNotFound`) |
| `aprender/[courseSlug]/[lessonId]` | novo | novo | herda `[courseSlug]` |
| `admin` (dashboard) | novo | novo | novo `admin/not-found.tsx` (dentro do shell) |
| `admin/*` demais | ok | ok | herda `admin/not-found` |
| global | — | novo `global-error.tsx` (estilo inline, cores dos tokens; substitui `<html>`) | — |

Prefetch: nenhum `<Link>` desativa o prefetch padrão. Pending: formulários de mutação já usam `Button pending`/`useActionState`; buscas são GET.

## UX-003 — larguras (0 px de overflow horizontal em todas)

| Tela | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| /dev/admin-dashboard, biblioteca, inicio, player, shells/player, brand | ok | ok | ok | ok | ok |
| /dev/admin-orders, /dev/admin-students | corrigido (links 24px) | corrigido | corrigido | corrigido | corrigido |
| /dev/catalog, catalog/curso, checkout, landing | ok | ok | ok | ok | ok |
| /dev/conta | ok | ok | ok | corrigido (mostrar senha) | corrigido |
| /entrar, /cadastro | corrigido | corrigido | corrigido | corrigido | corrigido |
| /recuperar-senha, /redefinir-senha | ok | ok | ok | ok | ok |
| /, /cursos, /privacidade, /termos | ok | ok | ok | ok | ok |
| 404 (`/nao-existe`) | ok | ok | ok | ok | ok |

## Achados e correções
- Links de lista/tabela admin (`.link` em Orders/Students): 24px -> `min-height: 2.75rem`.
- Links "Esqueci minha senha"/rodapé do form de auth: `min-height: 2.75rem`.
- Botão "Mostrar senha": 36px -> 44px.
- Nenhum input com fonte < 16px. Tab bar do aluno já respeita `env(safe-area-inset-bottom)`; `viewportFit: 'cover'` ativo. Tabelas admin já viram cards no mobile.

## Pendências
- `Button`/`IconButton` `size="sm"` têm 36px por design com ponteiro fino e viram 44px em `pointer: coarse`; não alterado.
- Itens de nav "Cursos"/"Ver fila" com 40-43px de largura (altura 44): aceitável.
- "Sair" no UserMenu (form oculto) sem indicador de pending.
- Rotas autenticadas reais precisam de revisão com Supabase local e sessão.

## UX-004 — Desempenho

Medição: `.next/diagnostics/route-bundle-stats.json` (First Load JS descomprimido, KB; o Next 16/Turbopack não imprime a coluna no `next build`) e Playwright/Chromium mobile (390px, 4x CPU, ~1,6 Mbps/150 ms RTT, mediana de 3) em `next start`. Lighthouse não está instalado.

Já estavam corretos (nada a mudar): capas via `next/image` (`IsoCover`) com `sizes` por contexto e `priority` só nas 2 primeiras do catálogo/biblioteca e na capa do curso/continuar; único `<img>` cru é o QR PIX (data URL) e a miniatura de vídeo externa; fontes `next/font/local` latin, `display: 'swap'`, variáveis, sem Google Fonts.

### First Load JS por rota (KB)
| Rota | Antes | Depois | Δ |
|---|---|---|---|
| `/admin/cursos/[id]` | 905 | 546 | -359 |
| `/admin/cursos/novo` | 887 | 529 | -359 |
| `/admin/cursos/[id]/aulas/[lessonId]` | 899 | 641 | -258 |
| `/admin/alunos/[id]`, `/admin/cursos` | 629 | 524 | -105 |
| `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | 627-629 | 522-524 | -105 |
| `/conta` | 619 | 512 | -107 |
| `/`, `/cursos`, `/cursos/[slug]`, `/inicio`, `/minha-biblioteca` | 499-533 | igual | 0 |

### Métricas de página (mobile throttled)
| Página | FCP/LCP antes | FCP/LCP depois | JS transferido (raw) |
|---|---|---|---|
| `/dev/landing` | 1924 ms / 1924 ms | 1936 ms / 1936 ms | 541 KB -> 541 KB |
| `/dev/catalog` | 1924 ms / 1924 ms | 1992 ms / 1992 ms | 541 KB -> 541 KB |
CLS 0,000 em ambas. Diferenças são ruído: as rotas públicas já não carregavam zod/supabase; o ganho está nas telas com formulários e no admin.

### Mudanças
- Client Components importavam `schemas.ts` (que puxa zod, ~105 KB) só por constantes/helpers. Criados módulos sem zod, re-exportados pelos `schemas.ts` (server inalterado): `auth/form-state.ts`, `account/form-state.ts`, `courses/constants.ts`, `curriculum/constants.ts`, `students/constants.ts`.
- `CoverUploader`: `supabase/browser` e `env/client` por `import()` ao enviar (-254 KB no editor de curso).
- `MaterialForm` via `next/dynamic` (`LazyMaterialForm`, `ssr: false`, placeholder `aria-busy`) no editor de aulas.

### Proposta (não implementada): leitura pública cacheável
Catálogo (`/cursos`) e curso (`/cursos/[slug]`) são dinâmicos porque o mesmo componente lê sessão (posse/"já comprado"). Separar em: (1) `getPublicCatalog()`/`getPublicCourse(slug)` com cliente Supabase anônimo sem cookies (`createClient` do supabase-js com a publishable key, só dados que a RLS já libera a `anon`) dentro de `unstable_cache`/`"use cache"` com `cacheTag('catalog')` e `cacheLife` de minutos; (2) a parte do usuário (posse, CTA) como componente filho em `<Suspense>` lendo cookies, ou ilha client buscando `/api/me/ownership`; (3) `revalidateTag('catalog')` nas actions de curso (publicar, editar, capa) e em `fulfill_order` não é necessário. Riscos: nunca cachear nada com sessão; preço sempre do banco; validar que `anon` não enxerga rascunhos. Exige alterar `queries.ts` e actions (fora do escopo).

### Pendências
- `/` e `/cursos` carregam ~18 KB a mais que as telas `/dev/*` (shell/UserMenu/menus); candidato a `dynamic()` do DropdownMenu.
- `materials/schemas.ts` ainda é importado por client (labels, `formatBytes`); o chunk de zod agora só entra com o `MaterialForm` lazy. Vale o mesmo split.
- Lighthouse oficial e rotas autenticadas reais não medidos (sem Supabase local).
