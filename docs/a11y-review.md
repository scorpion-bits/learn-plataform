# Revisão de acessibilidade (UX-002)

Medido em 2026-10-09 com axe-core (`node_modules/axe-core/axe.min.js` injetado via Playwright/Chromium; sem lib nova), tags `wcag2a/aa`, `wcag21a/aa`, `wcag22aa`, `best-practice`. Telas: todas as vitrines `/dev/*`, `/`, `/cursos`, `/entrar`, `/cadastro` e 404, em 390 e 1440 px. Sem Supabase local: `/cursos` mostrou o estado de erro da rota. Rotas autenticadas reais não foram medidas (usar as vitrines).

Linha de base: 0 `critical`; `serious` em 3 tipos de achado; `moderate` em 5. Depois das correções: 0 `critical`, 0 `serious` reais (1 falso positivo de vitrine, abaixo), 0 `moderate`.

## Achados automáticos

| Tela | Achado | Severidade | Status |
|---|---|---|---|
| `/dev/inicio`, `/dev/biblioteca`, `/dev/checkout` (menu do usuário) | `label-content-name-mismatch`: iniciais do avatar eram texto no DOM e não entravam no `aria-label` (WCAG 2.5.3) | serious | Corrigido: iniciais via `::before` (`data-initials`); nome acessível "Menu de …" inalterado |
| `/dev/player` (poster do vídeo) | Mesmo problema com o rótulo do provedor ("YouTube") | serious | Corrigido: `data-label` + `::before` |
| `/dev/shells/player` (1440) | `scrollable-region-focusable` em `#conteudo` (vitrine sem nenhum controle focável) | serious | Falso positivo: na aula real há links/botões; não alterado |
| `/dev/player`, `/dev/shells/player` | `region`: barra de ações da aula era `role="group"`, fora de landmark | moderate | Corrigido: `role="region"` com o mesmo `aria-label` |
| `/dev/biblioteca` | `heading-order`: card de curso usava `h3` logo após `h1` | moderate | Corrigido: `h2` |
| `/cursos` (estado de erro) | `page-has-heading-one`: `ErrorState` renderiza `h2` quando substitui a página | moderate | Corrigido: prop `headingLevel` (padrão 2); `RouteError` e `PlayerRouteError` usam 1 |
| `/dev/conta` | `landmark-one-main`: vitrine sem shell | moderate | Corrigido (`<main id="conteudo">` na vitrine; a rota real usa o shell) |
| `/entrar`, `/cadastro`, `/`, 404, demais `/dev/*` | Sem violações | - | OK |

Contraste: axe `color-contrast` sem falhas em nenhuma tela (inclui badges e `--text-dim`). A tabela em `src/styles/tokens.css` continua válida (`--text-dim` >= 4.87:1 até `ink-700`; `--text-faint` só decoração e bordas de controle, >= 3:1 sobre `ink-950/900/850`). Tokens não alterados.

## Teclado e leitor de tela (manual, Chromium)

| Área | Verificação | Resultado |
|---|---|---|
| Skip link | 1º Tab em `/dev/inicio`, `/dev/catalog`, `/dev/shells/player`: "Pular para o conteúdo" visível; Enter foca `main#conteudo` | OK |
| 404 | Não tinha "Pular para o conteúdo" | Corrigido (`SkipLink` em `not-found.tsx`) |
| `/entrar` | `autoFocus` no e-mail faz o 1º Tab ir ao campo seguinte; skip link acessível por Shift+Tab | Aceito (padrão de login); registrado |
| Menu do usuário | Seta para baixo abre e foca o 1º item; setas/Home/End; Esc fecha e devolve o foco ao gatilho | OK |
| Dialog/Drawer (player, 390 px) | Foco inicial no 1º controle, foco preso (`<dialog>` modal), Esc fecha e devolve o foco a "Aulas" | OK |
| Tabs | Código revisado: setas/Home/End, `tabindex` roving, `aria-controls`/`aria-labelledby` | OK (testes unitários existentes) |
| Toasts | Região `aria-live="polite"` sempre montada, não rouba foco, pausa em hover/foco, botão "Dispensar notificação" | OK |
| Formulários | `Field` liga `aria-describedby`/`aria-invalid`/`role=alert`; auth, conta e checkout já focam o 1º inválido | OK |
| `CourseForm` (admin) | Erro só aparecia em toast; foco não ia ao campo | Corrigido: foca o 1º `aria-invalid` |
| `MaterialForm` (admin) | Idem | Corrigido |
| Player | Navegação de aulas (links), "Concluir aula" (botão) e Drawer acessíveis por teclado | OK |
| Movimento | `prefers-reduced-motion` global em `base.css` + tokens de duração + regras locais (IsoCube, CubeProgress, Spinner, Skeleton, Dock) | OK |

## Pendências
- Telas autenticadas reais (checkout, admin com dados) sem medição automática: exigem Supabase local e sessão.
- Leitor de tela real (NVDA/VoiceOver) não testado; conferido por semântica e axe.
- Tabs e o Dialog de exclusão de conta só por revisão de código/testes unitários (a vitrine esconde o botão para admin).
- Sugestão: adicionar `@axe-core/playwright` ao E2E mediante ADR.
