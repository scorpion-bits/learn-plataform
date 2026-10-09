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
